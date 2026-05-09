import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FolderIcon, PlusIcon, WorkspaceIcon } from './Icons';

interface WelcomeViewProps {
  onAddWorkspace: () => void;
  onCreateWorkspace: () => void;
}

export const WelcomeView: FC<WelcomeViewProps> = ({ onAddWorkspace, onCreateWorkspace }) => {
  const { t, i18n } = useTranslation();
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#E8E8ED] flex items-center justify-center relative">
      {/* Language Selector */}
      <div className="absolute top-4 right-4">
        <Select
          value={i18n.language}
          onValueChange={(lng) => {
            i18n.changeLanguage(lng);
            localStorage.setItem('i18n-lang', lng);
          }}
        >
          <SelectTrigger className="w-auto gap-1.5 h-8 px-2.5 text-xs text-[#8B8B9E] border-[#1E1E26] bg-[#141419] hover:bg-[#1A1A22] hover:text-[#E8E8ED]">
            <Globe className="w-3.5 h-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="zh-CN">中文</SelectItem>
            <SelectItem value="en-US">English</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="max-w-lg w-full mx-auto text-center p-8">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#6366F1] flex items-center justify-center shadow-lg animate-subtle-pulse">
            <WorkspaceIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-semibold mb-3">{t('welcome.title')}</h1>
          <p className="text-[#8B8B9E] text-sm leading-relaxed">
            {t('welcome.desc')}
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-[#141419] border border-[#1E1E26] text-left hover:border-[#6366F1]/30 hover:bg-[#1A1A22] transition-all duration-150">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <FolderIcon className="w-4 h-4 text-[#6366F1]" />
              {t('welcome.whatIsWorkspace')}
            </h3>
            <p className="text-xs text-[#8B8B9E] leading-relaxed">
              {t('welcome.workspaceDesc')}
            </p>
            <pre className="mt-2 text-xs text-[#55556A] bg-[#0A0A0F] font-mono rounded p-2 overflow-x-auto">
{`workspace/
├── projects/      # ${t('welcome.dirMainRepo')}
│   ├── backend/
│   └── frontend/
└── worktrees/     # ${t('welcome.dirWorktrees')}`}
            </pre>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              className="h-12 hover:-translate-y-0.5 transition-transform duration-150"
              onClick={onAddWorkspace}
            >
              <FolderIcon className="w-4 h-4 mr-2" />
              {t('welcome.importExisting')}
            </Button>
            <Button
              className="h-12 hover:-translate-y-0.5 transition-transform duration-150"
              onClick={onCreateWorkspace}
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              {t('welcome.createNew')}
            </Button>
          </div>

          <p className="text-xs text-[#55556A]">
            {t('welcome.hint')}
          </p>
        </div>
      </div>
    </div>
  );
};
