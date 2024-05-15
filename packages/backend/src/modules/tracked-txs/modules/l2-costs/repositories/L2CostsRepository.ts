import { Logger } from '@l2beat/backend-tools'
import { ProjectId, UnixTime } from '@l2beat/shared-pure'
import { Knex } from 'knex'
import { L2CostsRow } from 'knex/types/tables'

import {
  BaseRepository,
  CheckConvention,
} from '../../../../../peripherals/database/BaseRepository'
import { Database } from '../../../../../peripherals/database/Database'
import { TrackedTxId } from '../../../types/TrackedTxId'

export interface L2CostsRecord {
  timestamp: UnixTime
  txHash: string
  trackedTxId: TrackedTxId
  gasUsed: number
  gasPrice: bigint
  calldataLength: number
  calldataGasUsed: number
  blobGasUsed: number | null
  blobGasPrice: bigint | null
}

export interface L2CostsRecordWithProjectId extends L2CostsRecord {
  projectId: ProjectId
}

export class L2CostsRepository extends BaseRepository {
  constructor(database: Database, logger: Logger) {
    super(database, logger)
    this.autoWrap<CheckConvention<L2CostsRepository>>(this)
  }

  async getAll(): Promise<L2CostsRecord[]> {
    const knex = await this.knex()
    const rows = await knex('l2_costs')
    return rows.map(toRecord)
  }

  async addMany(
    records: L2CostsRecord[],
    trx?: Knex.Transaction,
  ): Promise<number> {
    const knex = await this.knex(trx)
    const rows = records.map(toRow)
    await knex.batchInsert('l2_costs', rows, 1000)
    return rows.length
  }

  async getWithProjectIdByTimeRange(
    timeRange: [UnixTime, UnixTime],
  ): Promise<L2CostsRecordWithProjectId[]> {
    const [from, to] = timeRange
    const knex = await this.knex()
    const rows = await knex('l2_costs')
      .where('timestamp', '>=', from.toDate())
      .andWhere('timestamp', '<=', to.toDate())
      .join(
        'tracked_txs_configs',
        'l2_costs.tracked_tx_id',
        'tracked_txs_configs.id',
      )
      .orderBy('timestamp', 'asc')
    return rows.map(toRecordWithProjectId)
  }

  async findCountByProjectAndTimeRange(
    projectId: ProjectId,
    timeRange: [UnixTime, UnixTime],
  ): Promise<{ count: number }> {
    const [from, to] = timeRange
    const knex = await this.knex()
    const count = await knex('l2_costs as l')
      .join('tracked_txs_configs as c', 'l.tracked_tx_id', 'c.id')
      .where('c.project_id', projectId)
      .andWhere('l.timestamp', '>=', from.toDate())
      .andWhere('l.timestamp', '<', to.toDate())
      .count('* as count')

    if (count.length === 0) {
      return { count: 0 }
    }
    if (count.length > 1) {
      throw new Error('Expected exactly one row')
    }
    if (typeof count[0].count !== 'string') {
      throw new Error('Expected count to be a string')
    }

    return { count: parseInt(count[0].count) }
  }

  async getByProjectAndTimeRangePaginated(
    projectId: ProjectId,
    timeRange: [UnixTime, UnixTime],
    start: number,
    limit: number,
  ): Promise<L2CostsRecord[]> {
    const [from, to] = timeRange
    const knex = await this.knex()
    const rows = await knex('l2_costs as l')
      .join('tracked_txs_configs as c', 'l.tracked_tx_id', 'c.id')
      .where('c.project_id', projectId)
      .andWhere('l.timestamp', '>=', from.toDate())
      .andWhere('l.timestamp', '<', to.toDate())
      .distinct('l.tx_hash')
      .select('l.*')
      .orderBy('l.timestamp', 'asc')
      .offset(start)
      .limit(limit)
    return rows.map(toRecord)
  }

  async deleteFromById(
    id: TrackedTxId,
    deleteFromInclusive: UnixTime,
    trx?: Knex.Transaction,
  ) {
    const knex = await this.knex(trx)
    return knex('l2_costs')
      .where('tracked_tx_id', id)
      .andWhere('timestamp', '>=', deleteFromInclusive.toDate())
      .delete()
  }

  async deleteAll() {
    const knex = await this.knex()
    return knex('l2_costs').delete()
  }
}

function toRow(record: L2CostsRecord): L2CostsRow {
  return {
    timestamp: record.timestamp.toDate(),
    tx_hash: record.txHash,
    tracked_tx_id: record.trackedTxId.toString(),
    gas_used: record.gasUsed,
    gas_price: record.gasPrice.toString(),
    calldata_gas_used: record.calldataGasUsed,
    calldata_length: record.calldataLength,
    blob_gas_used: record.blobGasUsed,
    blob_gas_price: record.blobGasPrice?.toString() ?? null,
  }
}

function toRecord(row: L2CostsRow): L2CostsRecord {
  return {
    timestamp: UnixTime.fromDate(row.timestamp),
    txHash: row.tx_hash,
    trackedTxId: TrackedTxId.unsafe(row.tracked_tx_id),
    gasUsed: row.gas_used,
    gasPrice: BigInt(row.gas_price),
    calldataGasUsed: row.calldata_gas_used,
    calldataLength: row.calldata_length,
    blobGasUsed: row.blob_gas_used,
    blobGasPrice: row.blob_gas_price ? BigInt(row.blob_gas_price) : null,
  }
}

function toRecordWithProjectId(
  row: L2CostsRow & { project_id: string },
): L2CostsRecord & { projectId: ProjectId } {
  return {
    ...toRecord(row),
    projectId: ProjectId(row.project_id),
  }
}
