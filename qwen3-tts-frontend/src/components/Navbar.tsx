import { useEffect, useState } from 'react'
import { Menu, LogOut, Users, Settings, Globe, Home, Mic, BookOpen, Cpu } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/contexts/AuthContext'
import { useUserPreferences } from '@/contexts/UserPreferencesContext'
import { ttsApi, type TTSStatus } from '@/lib/api'

interface NavbarProps {
  onToggleSidebar?: () => void
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
  const { logout, user } = useAuth()
  const { changeLanguage } = useUserPreferences()
  const { t, i18n } = useTranslation(['nav', 'constants'])
  const location = useLocation()
  const [ttsStatus, setTtsStatus] = useState<TTSStatus | null>(null)

  useEffect(() => {
    if (!user) {
      setTtsStatus(null)
      return
    }

    let cancelled = false

    const fetchTtsStatus = async () => {
      try {
        const status = await ttsApi.getStatus()
        if (!cancelled) {
          setTtsStatus(status)
        }
      } catch {
        if (!cancelled) {
          setTtsStatus(null)
        }
      }
    }

    fetchTtsStatus()
    const intervalId = window.setInterval(fetchTtsStatus, 15000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [user])

  const modelName = ttsStatus?.model_name || '本地模型'
  const modelStateLabel = !ttsStatus
    ? '状态不可用'
    : ttsStatus.loaded
      ? '已加载'
      : ttsStatus.available
        ? '未加载'
        : '不可用'
  const modelLabel = `${modelName} · ${modelStateLabel}`
  const modelDetail = ttsStatus
    ? `${modelName}${ttsStatus.model_source ? ` · ${ttsStatus.model_source}` : ''}`
    : '模型状态暂不可用'
  const modelBadgeClassName = ttsStatus?.loaded
    ? 'border-emerald-500/45 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
    : ttsStatus
      ? 'border-amber-500/55 bg-amber-500/15 text-amber-800 dark:text-amber-200'
      : 'border-slate-400/55 bg-slate-500/10 text-slate-700 dark:text-slate-300'

  return (
    <nav className="h-16 flex items-center justify-end px-4 gap-2">
      {onToggleSidebar && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="lg:hidden mr-auto"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {location.pathname !== '/' && (
        <Link to="/" className="mr-auto">
          <Button variant="ghost" size="icon">
            <Home className="h-5 w-5" />
          </Button>
        </Link>
      )}

      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={`hidden md:inline-flex max-w-[300px] shrink-0 gap-1.5 ${modelBadgeClassName}`}
            >
              <Cpu className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{modelLabel}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start" sideOffset={8} className="max-w-sm">
            <div className="space-y-1">
              <p className="font-medium">本地模型状态</p>
              <p>{modelStateLabel}：{modelDetail}</p>
              {ttsStatus?.model_key && (
                <p className="text-xs text-muted-foreground">当前类型：{ttsStatus.model_key}</p>
              )}
              {ttsStatus?.model_path && (
                <p className="break-all text-xs text-muted-foreground">路径：{ttsStatus.model_path}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Link to="/voices">
        <Button variant="ghost" size="icon">
          <Mic className="h-5 w-5" />
        </Button>
      </Link>

      <Link to="/audiobook">
        <Button variant="ghost" size="icon">
          <BookOpen className="h-5 w-5" />
        </Button>
      </Link>

      {user?.is_superuser && (
        <Link to="/users">
          <Button variant="ghost" size="icon">
            <Users className="h-5 w-5" />
          </Button>
        </Link>
      )}
      <Link to="/settings">
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </Link>
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <Globe className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => changeLanguage('zh-CN')}>
            {t('constants:uiLanguages.zh-CN')} {i18n.language === 'zh-CN' && '✓'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => changeLanguage('zh-TW')}>
            {t('constants:uiLanguages.zh-TW')} {i18n.language === 'zh-TW' && '✓'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => changeLanguage('en-US')}>
            {t('constants:uiLanguages.en-US')} {i18n.language === 'en-US' && '✓'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => changeLanguage('ja-JP')}>
            {t('constants:uiLanguages.ja-JP')} {i18n.language === 'ja-JP' && '✓'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => changeLanguage('ko-KR')}>
            {t('constants:uiLanguages.ko-KR')} {i18n.language === 'ko-KR' && '✓'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="ghost" size="icon" onClick={logout}>
        <LogOut className="h-5 w-5" />
      </Button>
    </nav>
  )
}
