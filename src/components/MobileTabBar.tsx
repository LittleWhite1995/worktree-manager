import { type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { GitBranch, FileText } from 'lucide-react';

type MobileTab = 'list' | 'detail';

interface MobileTabBarProps {
    activeTab: string;
    onTabChange: (tab: MobileTab) => void;
    hasSelectedWorktree?: boolean;
}

const TAB_CONFIG: { id: MobileTab; labelKey: string; fallback: string; Icon: typeof GitBranch }[] = [
    { id: 'list', labelKey: 'mobile.tabList', fallback: 'Worktrees', Icon: GitBranch },
    { id: 'detail', labelKey: 'mobile.tabDetail', fallback: 'Detail', Icon: FileText },
];

export const MobileTabBar: FC<MobileTabBarProps> = ({
    activeTab,
    onTabChange,
    hasSelectedWorktree = false,
}) => {
    const { t } = useTranslation();

    return (
        <div
            className="shrink-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-700/50 relative z-[60]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            <div className="flex items-stretch h-14">
                {TAB_CONFIG.map(({ id, labelKey, fallback, Icon }) => {
                    const disabled = id === 'detail' && !hasSelectedWorktree;
                    const active = activeTab === id;

                    const tabClassName = disabled
                        ? 'text-slate-700 cursor-not-allowed'
                        : active
                            ? 'text-blue-400'
                            : 'text-slate-500 active:text-slate-300';

                    return (
                        <button
                            key={id}
                            onClick={() => !disabled && onTabChange(id)}
                            className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-all active:scale-95 ${tabClassName}`}
                            disabled={disabled}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="text-[10px] font-medium leading-none">{t(labelKey, fallback)}</span>
                            {active && (
                                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-blue-400" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
