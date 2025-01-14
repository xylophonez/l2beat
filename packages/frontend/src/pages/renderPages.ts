import { Config } from '../build/config'
import { Page, PagesData } from './Page'
import { getBridgesRiskPage } from './bridges/risk'
import { getBridgesSummaryPage } from './bridges/summary'
import { getDonatePage } from './donate'
import { getFaqPage } from './faq'
import { getGlossaryPage } from './glossary'
import { getGovernancePage } from './governance/index'
import { getGovernancePublicationPages } from './governance/publication'
import { getGovernancePublicationsPage } from './governance/publications'
import { getMultisigReportDownloadPage } from './multisig-report'
import { outputPages } from './output'
import { getBridgeProjectPages } from './project/bridge'
import { getProjectPages } from './project/layer2'
import { getL3sProjectPages } from './project/layer3'
import { getZkCatalogProjectPages } from './project/zk-catalog'
import { getActivityPage } from './scaling/activity'
import { getCostsPage } from './scaling/costs'
import { getScalingDataAvailabilityPage } from './scaling/data-availability'
import { getFinalityPage } from './scaling/finality'
import { getLivenessPage } from './scaling/liveness'
import { getProjectTvlBreakdownPages } from './scaling/projects-tvl-breakdown'
import { getRiskPage } from './scaling/risk'
import { getSummaryPage } from './scaling/summary'
import { getTvlPage } from './scaling/tvl'
import { getZkCatalogPage } from './zk-catalog'

export async function renderPages(config: Config, pagesData: PagesData) {
  const pages: Page[] = []

  const {
    tvlApiResponse,
    activityApiResponse,
    verificationStatus,
    tvlBreakdownApiResponse,
    livenessApiResponse,
    finalityApiResponse,
    l2CostsApiResponse,
    implementationChange,
  } = pagesData

  pages.push(getRiskPage(config, pagesData))
  pages.push(getSummaryPage(config, pagesData))
  pages.push(getFaqPage(config))
  pages.push(await getDonatePage(config))
  pages.push(...getProjectPages(config, pagesData))
  pages.push(...getL3sProjectPages(config, pagesData))

  pages.push(getBridgesSummaryPage(config, pagesData))
  pages.push(getBridgesRiskPage(config, pagesData))
  pages.push(...getBridgeProjectPages(config, pagesData))

  pages.push(getMultisigReportDownloadPage(config))

  if (activityApiResponse) {
    pages.push(
      getActivityPage(config, {
        activityApiResponse,
        verificationStatus,
        implementationChange,
      }),
    )
  }

  pages.push(getTvlPage(config, pagesData))

  if (config.features.tvlBreakdown && tvlBreakdownApiResponse) {
    pages.push(
      ...getProjectTvlBreakdownPages(config, {
        tvlApiResponse,
        tvlBreakdownApiResponse,
      }),
    )
  }

  if (config.features.liveness && livenessApiResponse) {
    pages.push(
      getLivenessPage(config, {
        livenessApiResponse,
        tvlApiResponse,
        implementationChange,
      }),
    )
  }

  if (config.features.finality && finalityApiResponse) {
    pages.push(
      getFinalityPage(config, {
        finalityApiResponse,
        tvlApiResponse,
        implementationChange,
      }),
    )
  }

  if (config.features.governancePage) {
    pages.push(getGovernancePage(config))
    pages.push(getGovernancePublicationsPage(config))
    pages.push(...getGovernancePublicationPages(config))
  }

  if (config.features.glossary) {
    pages.push(getGlossaryPage(config))
  }

  pages.push(
    getScalingDataAvailabilityPage(config, {
      tvlApiResponse,
      implementationChange,
    }),
  )

  if (config.features.costsPage && l2CostsApiResponse) {
    pages.push(
      getCostsPage(config, {
        tvlApiResponse,
        l2CostsApiResponse,
        activityApiResponse,
        implementationChange,
      }),
    )
  }

  if (config.features.zkCatalog) {
    pages.push(getZkCatalogPage(config))
    pages.push(...getZkCatalogProjectPages(config))
  }

  outputPages(pages)
}
