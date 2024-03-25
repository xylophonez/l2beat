import { Logger } from '@l2beat/backend-tools'
import {
  assert,
  ProjectId,
  TrackedTxsConfigSubtype,
  UnixTime,
} from '@l2beat/shared-pure'
import { utils } from 'ethers'
import { DecompressionStream } from 'stream/web'

import { BlobClient } from '../../../../peripherals/blobclient/BlobClient'
import { RpcClient } from '../../../../peripherals/rpcclient/RpcClient'
import { LivenessRepository } from '../../../tracked-txs/modules/liveness/repositories/LivenessRepository'
import { BaseAnalyzer } from '../types/BaseAnalyzer'
import { blobToData } from './blobToData'
import { ChannelBank } from './ChannelBank'
import { decodeSpanBatch } from './decodeSpanBatch'
import { getFrames } from './getFrames'

export class OpStackFinalityAnalyzer extends BaseAnalyzer {
  private readonly channelBank = new ChannelBank()

  constructor(
    private readonly blobClient: BlobClient,
    private readonly logger: Logger,
    provider: RpcClient,
    livenessRepository: LivenessRepository,
    projectId: ProjectId,
  ) {
    super(provider, livenessRepository, projectId)
    this.logger = logger.for(this)
  }

  override getTrackedTxSubtype(): TrackedTxsConfigSubtype {
    return 'batchSubmissions'
  }

  async getFinality(transaction: {
    txHash: string
    timestamp: UnixTime
  }): Promise<number[]> {
    try {
      this.logger.debug('Getting finality', { transaction })
      const l1Timestamp = transaction.timestamp
      // get blobs relevant to the transaction
      const { relevantBlobs, blockNumber } =
        await this.blobClient.getRelevantBlobs(transaction.txHash)

      const rollupData = relevantBlobs.map(({ blob }) =>
        blobToData(byteArrFromHexStr(blob)),
      )
      const frames = rollupData.map((ru) => getFrames(ru))
      const channel = this.channelBank.addFramesToChannel(frames, blockNumber)
      // no channel was closed in this tx, so no txs were finalized
      if (!channel) {
        return []
      }
      const assembledChannel = channel.assemble()
      const encodedBatch = await getBatchFromChannel(assembledChannel)
      const blocksWithTimestamps = decodeSpanBatch(encodedBatch)
      assert(blocksWithTimestamps.length > 0, 'No blocks in the batch')
      const blocksWithDelays = blocksWithTimestamps.map((block) => ({
        txCount: block.txCount,
        delay: l1Timestamp.toNumber() - block.timestamp,
      }))

      const totalWeight = blocksWithDelays.reduce(
        (acc, block) => acc + block.txCount,
        0,
      )
      const weightedDelays = blocksWithDelays.map(
        (block) => (block.txCount * block.delay) / totalWeight,
      )
      const weightedAverage = weightedDelays.reduce(
        (acc, delay) => acc + delay,
        0,
      )

      // TODO: should be better
      return [weightedAverage]
    } catch (error) {
      this.logger.error('Error while getting finality', {
        transaction: transaction.txHash,
        error,
      })
      throw error
    }
  }
}

async function getBatchFromChannel(channel: Uint8Array) {
  const decompressed = await decompressToByteArray(channel)
  const decoded = utils.RLP.decode(decompressed) as unknown

  // we assume decoded is a hex string, meaning it represents only one span batch
  assert(typeof decoded === 'string', 'Decoded is not a string')

  return byteArrFromHexStr(decoded)
}

async function decompressToByteArray(compressedData: Uint8Array) {
  const blob = new Blob([compressedData])
  const ds = new DecompressionStream('deflate')
  const stream = blob.stream().pipeThrough(ds)
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let totalSize = 0
  while (true) {
    try {
      const { done, value } = (await reader.read()) as {
        done: boolean
        value: Uint8Array
      }
      if (done) break
      chunks.push(value)
      totalSize += value.length
    } catch (err) {
      if (err instanceof Error && err.message === 'unexpected end of file')
        break
      throw err
    }
  }
  const concatenatedChunks = new Uint8Array(totalSize)
  let offset = 0
  for (const chunk of chunks) {
    concatenatedChunks.set(chunk, offset)
    offset += chunk.length
  }
  return concatenatedChunks
}

function byteArrFromHexStr(hexString: string) {
  const str = hexString.startsWith('0x') ? hexString.slice(2) : hexString
  const match = str.match(/.{1,2}/g)

  assert(match !== null, 'Invalid hex string')

  return Uint8Array.from(match.map((byte) => parseInt(byte, 16)))
}
