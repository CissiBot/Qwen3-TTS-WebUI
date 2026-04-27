import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { ElementType } from 'react'

interface IconLabelProps {
  icon: ElementType
  tooltip: string
  required?: boolean
}

export function IconLabel({ icon: Icon, tooltip, required = false }: IconLabelProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex w-fit items-center gap-1 cursor-help">
            <Icon className="h-4 w-4 text-muted-foreground" />
            {required && <span className="text-destructive">*</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent side="right" align="center" sideOffset={8}>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
