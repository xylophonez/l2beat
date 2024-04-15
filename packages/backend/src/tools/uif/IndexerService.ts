import { assert } from '@l2beat/backend-tools'

import { IndexerConfigurationRepository } from './IndexerConfigurationRepository'
import { IndexerStateRepository } from './IndexerStateRepository'
import { Configuration, SavedConfiguration } from './multi/types'

export class IndexerService {
  constructor(
    private readonly indexerStateRepository: IndexerStateRepository,
    private readonly indexerConfigurationRepository: IndexerConfigurationRepository,
  ) {}

  // #region ManagedChildIndexer & ManagedMultiIndexer

  async setSafeHeight(indexerId: string, safeHeight: number) {
    const record = await this.indexerStateRepository.findIndexerState(indexerId)
    if (!record) {
      await this.indexerStateRepository.add({ indexerId, safeHeight })
      return
    }
    await this.indexerStateRepository.setSafeHeight(indexerId, safeHeight)
  }

  async getSafeHeight(indexerId: string): Promise<number | undefined> {
    const record = await this.indexerStateRepository.findIndexerState(indexerId)
    return record?.safeHeight
  }

  // #endregion
  // #region ManagedMultiIndexer

  async upsertConfigurations<T>(
    indexerId: string,
    configurations: SavedConfiguration<T>[],
  ): Promise<void> {
    const encoded = configurations.map((config) => ({
      ...config,
    }))

    await this.indexerConfigurationRepository.addOrUpdateManyConfigurations(
      encoded.map((e) => ({ ...e, indexerId })),
    )
  }

  async getSavedConfigurations<T>(
    indexerId: string,
    runtime: Configuration<T>[],
  ): Promise<SavedConfiguration<T>[]> {
    const db = await this.indexerConfigurationRepository.getSavedConfigurations(
      indexerId,
    )

    const configurations: (SavedConfiguration<T> & {
      indexerId?: string
    })[] = db.map((d) => {
      const properties = runtime.find((r) => r.id === d.id)?.properties

      assert(properties, 'Configuration not found')

      return {
        ...d,
        properties,
      }
    })

    for (const config of configurations) {
      delete config.indexerId
    }

    return configurations.map((config) => ({
      ...config,
    }))
  }

  async updateSavedConfigurations(
    indexerId: string,
    configurationIds: string[],
    currentHeight: number | null,
  ): Promise<void> {
    await this.indexerConfigurationRepository.updateSavedConfigurations(
      indexerId,
      configurationIds,
      currentHeight,
    )
  }

  async persistOnlyUsedConfigurations(
    indexerId: string,
    configurationIds: string[],
  ): Promise<void> {
    await this.indexerConfigurationRepository.deleteConfigurationsExcluding(
      indexerId,
      configurationIds,
    )
  }

  // #endregion
}
