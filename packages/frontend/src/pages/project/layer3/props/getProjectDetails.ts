import { Layer3 } from '@l2beat/config'
import {
  ImplementationChangeReportApiResponse,
  ManuallyVerifiedContracts,
  VerificationStatus,
} from '@l2beat/shared-pure'
import isEmpty from 'lodash/isEmpty'

import { getRiskValues } from '../../../../utils/risks/values'
import { ProjectDetailsCharts } from '../../common/getCharts'
import { getContractSection } from '../../common/getContractSection'
import { getDiagramImage } from '../../common/getDiagramImage'
import { getPermissionsSection } from '../../common/getPermissionsSection'
import { getRiskSection } from '../../common/getRiskSection'
import {
  ProjectDetailsChartSection,
  ProjectDetailsContractsSection,
  ProjectDetailsDetailedDescriptionSection,
  ProjectDetailsKnowledgeNuggetsSection,
  ProjectDetailsMilestonesSection,
  ProjectDetailsPermissionsSection,
  ProjectDetailsRiskAnalysisSection,
  ProjectDetailsRiskSection,
  ProjectDetailsStateDerivationSection,
  ProjectDetailsStateValidationSection,
  ProjectDetailsTechnologySection,
  ProjectDetailsUpcomingDisclaimer,
} from '../../components/sections/types'
import { getTechnologyOverview } from './getTechnologyOverview'

export function getProjectDetails(
  project: Layer3,
  verificationStatus: VerificationStatus,
  manuallyVerifiedContracts: ManuallyVerifiedContracts,
  implementationChange: ImplementationChangeReportApiResponse | undefined,
  charts: ProjectDetailsCharts,
) {
  const isUpcoming = project.isUpcoming

  const technologySections = getTechnologyOverview(project)
  const permissionsSection = getPermissionsSection(
    project,
    verificationStatus,
    manuallyVerifiedContracts,
  )
  const riskSection = getRiskSection(project, verificationStatus)

  const items: ScalingDetailsItem[] = []

  if (charts.tvl) {
    items.push({
      type: 'ChartSection',
      props: {
        ...charts.tvl,
        id: 'tvl',
        title: 'Value Locked',
      },
    })
  }

  if (charts.activity) {
    items.push({
      type: 'ChartSection',
      props: {
        ...charts.activity,
        id: 'activity',
        title: 'Activity',
      },
    })
  }

  if (charts.costs) {
    items.push({
      type: 'ChartSection',
      props: {
        ...charts.costs,
        id: 'onchain-costs',
        title: 'Onchain costsys',
      },
    })
  }
  if (!isUpcoming && project.milestones && !isEmpty(project.milestones)) {
    items.push({
      type: 'MilestonesSection',
      props: {
        milestones: project.milestones,
        id: 'milestones',
        title: 'Milestones',
      },
    })
  }

  if (project.display.detailedDescription) {
    items.push({
      type: 'DetailedDescriptionSection',
      props: {
        id: 'detailed-description',
        title: 'Detailed description',
        description: project.display.description,
        detailedDescription: project.display.detailedDescription,
      },
    })
  }

  if (riskSection.riskGroups.length > 0) {
    items.push({
      type: 'RiskSection',
      props: riskSection,
    })
  }

  if (!isUpcoming) {
    items.push({
      type: 'RiskAnalysisSection',
      props: {
        id: 'risk-analysis',
        title: 'Risk analysis',
        riskValues: getRiskValues(project.riskView),
        isUnderReview: project.isUnderReview,
        warning: project.display.warning,
        redWarning: project.display.redWarning,
        isVerified: verificationStatus.projects[project.id.toString()],
      },
    })

    /* We want state derivation to be after technology section
       so we split the technology sections into two arrays
       and add state derivation in between */
    const technologySection = technologySections[0]
    items.push({
      type: 'TechnologySection',
      props: {
        items: technologySection.items,
        id: technologySection.id,
        title: technologySection.title,
        isUnderReview: technologySection.isUnderReview,
      },
    })

    if (project.stateDerivation) {
      items.push({
        type: 'StateDerivationSection',
        props: {
          id: 'state-derivation',
          title: 'State derivation',
          ...project.stateDerivation,
          isUnderReview: project.isUnderReview,
        },
      })
    }

    if (project.stateValidation) {
      items.push({
        type: 'StateValidationSection',
        props: {
          id: 'state-validation',
          title: 'State validation',
          image: getDiagramImage('state-validation', project.display.slug),
          stateValidation: project.stateValidation,
          isUnderReview: project.isUnderReview,
        },
      })
    }

    technologySections.slice(1).forEach((section) =>
      items.push({
        type: 'TechnologySection',
        props: {
          items: section.items,
          id: section.id,
          title: section.title,

          isUnderReview: section.isUnderReview,
        },
      }),
    )

    if (permissionsSection) {
      items.push({
        type: 'PermissionsSection',
        props: {
          ...permissionsSection,
          id: 'permissions',
          title: 'Permissions',
        },
      })
    }

    items.push({
      type: 'ContractsSection',
      props: {
        ...getContractSection(
          project,
          verificationStatus,
          manuallyVerifiedContracts,
          implementationChange,
        ),
      },
    })

    if (project.knowledgeNuggets && !isEmpty(project.knowledgeNuggets)) {
      items.push({
        type: 'KnowledgeNuggetsSection',
        props: {
          knowledgeNuggets: project.knowledgeNuggets,
          id: 'knowledge-nuggets',
          title: 'Knowledge nuggets',
        },
      })
    }
  } else {
    items.push({
      type: 'UpcomingDisclaimer',
      excludeFromNavigation: true,
    })
  }

  return {
    items,
    isUpcoming,
  }
}

export type ScalingDetailsItem = { excludeFromNavigation?: boolean } & (
  | ScalingDetailsSection
  | ProjectDetailsUpcomingDisclaimer
)

export type ScalingDetailsSection =
  | ProjectDetailsChartSection
  | ProjectDetailsDetailedDescriptionSection
  | ProjectDetailsMilestonesSection
  | ProjectDetailsKnowledgeNuggetsSection
  | ProjectDetailsRiskAnalysisSection
  | ProjectDetailsRiskSection
  | ProjectDetailsTechnologySection
  | ProjectDetailsStateDerivationSection
  | ProjectDetailsStateValidationSection
  | ProjectDetailsPermissionsSection
  | ProjectDetailsContractsSection
