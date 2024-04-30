import { cva, type VariantProps } from 'class-variance-authority'
import { type SVGAttributes } from 'react'

import { Icon } from '../Icon'

interface Props
  extends SVGAttributes<SVGElement>,
    VariantProps<typeof iconVariants> {}

const iconVariants = cva(undefined, {
  variants: {
    sentiment: {
      warning: 'fill-yellow-700 dark:fill-yellow-300',
      bad: 'fill-red-700 dark:fill-red-300',
    },
  },
})

export function RoundedWarningIcon({ className, sentiment, ...rest }: Props) {
  return (
    <Icon
      aria-label="Warning icon"
      className={iconVariants({
        className,
        sentiment,
      })}
      {...rest}
    >
      <path d="M11 15h2v2h-2v-2zm0-8h2v6h-2V7zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
    </Icon>
  )
}
