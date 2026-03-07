import { useState, useEffect, useRef, useCallback, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { getChangedFiles, getFileDiff } from '@/lib/backend';
import type { ChangedFile, FileDiff, ProjectStatus } from '../types';

// ==================== Status helpers ====================

const STATUS_COLORS: Record<string, string> = {
    M: 'text-amber-400',
    A: 'text-emerald-400',
    D: 'text-red-400',
    R: 'text-blue-400',
    C: 'text-blue-400',
    '?': 'text-slate-500',
};

const STATUS_LABELS: Record<string, string> = {
    M: 'Modified',
    A: 'Added',
    D: 'Deleted',
    R: 'Renamed',
    C: 'Copied',
    '?': 'Untracked',
};

const STATUS_BG: Record<string, string> = {
    M: 'bg-amber-500/10 border-amber-500/30',
    A: 'bg-emerald-500/10 border-emerald-500/30',
    D: 'bg-red-500/10 border-red-500/30',
    R: 'bg-blue-500/10 border-blue-500/30',
    '?': 'bg-slate-500/10 border-slate-500/30',
};

// ==================== Tree builder ====================

interface TreeNode {
    name: string;
    path: string;
    children: Map<string, TreeNode>;
    file?: ChangedFile & { projectName: string };
    expanded: boolean;
}

function buildTree(
    files: Array<ChangedFile & { projectName: string }>
): TreeNode {
    const root: TreeNode = {
        name: '',
        path: '',
        children: new Map(),
        expanded: true,
    };

    for (const file of files) {
        const parts = [file.projectName, ...file.path.split('/')];
        let current = root;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isFile = i === parts.length - 1;

            if (!current.children.has(part)) {
                current.children.set(part, {
                    name: part,
                    path: parts.slice(0, i + 1).join('/'),
                    children: new Map(),
                    expanded: true,
                });
            }

            const node = current.children.get(part)!;
            if (isFile) {
                node.file = file;
            }
            current = node;
        }
    }

    // Collapse single-child directory chains (GitLab-style)
    collapseTree(root);
    return root;
}

/**
 * Recursively merges single-child directory chains.
 * e.g., src -> main -> java -> com  becomes  src/main/java/com
 * Keeps project root nodes (depth 1) separate for clarity.
 */
function collapseTree(node: TreeNode): void {
    for (const [, child] of node.children) {
        collapseTree(child);
    }

    // Merge: if this node is a directory with exactly one child that is also a
    // directory (not a file), merge the child into this node.
    if (!node.file && node.children.size === 1) {
        const [, onlyChild] = Array.from(node.children.entries())[0];
        if (!onlyChild.file && onlyChild.children.size > 0) {
            // Don't collapse project root into the virtual root
            if (node.path === '') return;
            node.name = `${node.name}/${onlyChild.name}`;
            node.path = onlyChild.path;
            node.children = onlyChild.children;
        }
    }
}

// ==================== Diff computation ====================

interface DiffLine {
    type: 'same' | 'add' | 'remove' | 'empty';
    content: string;
    oldLine?: number;
    newLine?: number;
}

interface DiffPair {
    left: DiffLine;
    right: DiffLine;
}

function computeSideBySideDiff(oldText: string, newText: string): DiffPair[] {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');

    // Simple LCS-based diff
    const m = oldLines.length;
    const n = newLines.length;

    // For large files, use a simpler approach
    if (m + n > 5000) {
        return simpleDiff(oldLines, newLines);
    }

    // Build LCS table
    const dp: number[][] = Array.from({ length: m + 1 }, () =>
        new Array(n + 1).fill(0)
    );
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (oldLines[i - 1] === newLines[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    // Backtrack to find diff
    let i = m, j = n;
    const tempPairs: DiffPair[] = [];

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
            tempPairs.push({
                left: { type: 'same', content: oldLines[i - 1], oldLine: i },
                right: { type: 'same', content: newLines[j - 1], newLine: j },
            });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            tempPairs.push({
                left: { type: 'empty', content: '' },
                right: { type: 'add', content: newLines[j - 1], newLine: j },
            });
            j--;
        } else {
            tempPairs.push({
                left: { type: 'remove', content: oldLines[i - 1], oldLine: i },
                right: { type: 'empty', content: '' },
            });
            i--;
        }
    }

    tempPairs.reverse();
    return tempPairs;
}

function simpleDiff(oldLines: string[], newLines: string[]): DiffPair[] {
    const pairs: DiffPair[] = [];
    const maxLen = Math.max(oldLines.length, newLines.length);

    for (let i = 0; i < maxLen; i++) {
        const oldLine = i < oldLines.length ? oldLines[i] : undefined;
        const newLine = i < newLines.length ? newLines[i] : undefined;

        if (oldLine === newLine) {
            pairs.push({
                left: { type: 'same', content: oldLine!, oldLine: i + 1 },
                right: { type: 'same', content: newLine!, newLine: i + 1 },
            });
        } else if (oldLine !== undefined && newLine !== undefined) {
            pairs.push({
                left: { type: 'remove', content: oldLine, oldLine: i + 1 },
                right: { type: 'add', content: newLine, newLine: i + 1 },
            });
        } else if (oldLine !== undefined) {
            pairs.push({
                left: { type: 'remove', content: oldLine, oldLine: i + 1 },
                right: { type: 'empty', content: '' },
            });
        } else {
            pairs.push({
                left: { type: 'empty', content: '' },
                right: { type: 'add', content: newLine!, newLine: i + 1 },
            });
        }
    }

    return pairs;
}

// ==================== FileTreeItem ====================

const FileTreeItem: FC<{
    node: TreeNode;
    depth: number;
    selectedFile: string | null;
    onSelect: (projectName: string, filePath: string, key: string) => void;
    expandedPaths: Set<string>;
    onToggleExpand: (path: string) => void;
}> = ({ node, depth, selectedFile, onSelect, expandedPaths, onToggleExpand }) => {
    const isFile = !!node.file;
    const hasChildren = node.children.size > 0;
    const isExpanded = expandedPaths.has(node.path);
    const isSelected = selectedFile === node.path;

    if (isFile) {
        const file = node.file!;
        return (
            <button
                className={`w-full flex items-center gap-1.5 px-2 py-1 text-left text-xs transition-colors rounded-sm ${isSelected
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'hover:bg-slate-700/50 text-slate-300'
                    }`}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={() => onSelect(file.projectName, file.path, node.path)}
            >
                <span className={`font-mono text-[10px] font-bold ${STATUS_COLORS[file.status] || 'text-slate-500'}`}>
                    {file.status}
                </span>
                <span className="truncate">{node.name}</span>
            </button>
        );
    }

    if (!hasChildren) return null;

    return (
        <div>
            <button
                className="w-full flex items-center gap-1.5 px-2 py-1 text-left text-xs hover:bg-slate-700/50 text-slate-400 transition-colors rounded-sm"
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                onClick={() => onToggleExpand(node.path)}
            >
                <svg
                    className={`w-3 h-3 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <path d="M9 18l6-6-6-6" />
                </svg>
                <svg className="w-3.5 h-3.5 shrink-0 text-blue-400/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    {isExpanded ? (
                        <path d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                    ) : (
                        <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    )}
                </svg>
                <span className="truncate font-medium">{node.name}</span>
                <span className="text-[10px] text-slate-600 ml-auto shrink-0">
                    {countFiles(node)}
                </span>
            </button>
            {isExpanded && (
                <div>
                    {Array.from(node.children.values())
                        .sort((a, b) => {
                            // Directories first, then files
                            const aIsDir = !a.file;
                            const bIsDir = !b.file;
                            if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
                            return a.name.localeCompare(b.name);
                        })
                        .map((child) => (
                            <FileTreeItem
                                key={child.path}
                                node={child}
                                depth={depth + 1}
                                selectedFile={selectedFile}
                                onSelect={onSelect}
                                expandedPaths={expandedPaths}
                                onToggleExpand={onToggleExpand}
                            />
                        ))}
                </div>
            )}
        </div>
    );
};

function countFiles(node: TreeNode): number {
    if (node.file) return 1;
    let count = 0;
    for (const child of node.children.values()) {
        count += countFiles(child);
    }
    return count;
}

// ==================== Syntax Highlighting ====================

import hljs from 'highlight.js/lib/core';
import 'highlight.js/styles/vs2015.css';

// Register commonly used languages
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import java from 'highlight.js/lib/languages/java';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import sql from 'highlight.js/lib/languages/sql';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import go from 'highlight.js/lib/languages/go';
import csharp from 'highlight.js/lib/languages/csharp';
import shell from 'highlight.js/lib/languages/shell';
import yaml from 'highlight.js/lib/languages/yaml';
import properties from 'highlight.js/lib/languages/properties';
import markdown from 'highlight.js/lib/languages/markdown';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('java', java);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('json', json);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('python', python);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('go', go);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('shell', shell);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('properties', properties);
hljs.registerLanguage('markdown', markdown);

// File extension → hljs language mapping
function detectLanguage(filePath: string): string | undefined {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
        ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript', mjs: 'javascript',
        java: 'java', kt: 'java',
        rs: 'rust',
        py: 'python',
        go: 'go',
        cs: 'csharp',
        c: 'csharp', cpp: 'csharp', h: 'csharp',
        sql: 'sql',
        sh: 'shell', bash: 'shell', zsh: 'shell',
        xml: 'xml', html: 'xml', htm: 'xml', svg: 'xml', vue: 'xml', jsp: 'xml', aspx: 'xml',
        css: 'css', scss: 'css', less: 'css',
        json: 'json',
        yaml: 'yaml', yml: 'yaml', toml: 'yaml',
        properties: 'properties', ini: 'properties', conf: 'properties', cfg: 'properties',
        md: 'markdown', mdx: 'markdown',
    };
    return map[ext];
}

// Highlight a single line using highlight.js — returns HTML string
function highlightLine(line: string, lang: string | undefined): React.ReactNode {
    if (!line || !lang) return line;
    try {
        const result = hljs.highlight(line, { language: lang, ignoreIllegals: true });
        return <span dangerouslySetInnerHTML={{ __html: result.value }} />;
    } catch {
        return line;
    }
}


// ==================== DiffView ====================

const DiffView: FC<{
    diff: FileDiff;
    fileKey: string;
}> = ({ diff, fileKey }) => {
    if (diff.is_binary) {
        return (
            <div id={`diff-${fileKey}`} className="border-b border-slate-700/50">
                <div className="sticky top-0 z-10 bg-slate-800 border-b border-slate-700/50 px-4 py-2 flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-300">{diff.file_path}</span>
                    <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-slate-700/50">Binary</span>
                </div>
                <div className="px-4 py-6 text-center text-sm text-slate-500">
                    Binary file — cannot display diff
                </div>
            </div>
        );
    }

    const pairs = computeSideBySideDiff(diff.old_content, diff.new_content);
    const lang = detectLanguage(diff.file_path);

    // Limit rendering to avoid lag
    const MAX_LINES = 2000;
    const truncated = pairs.length > MAX_LINES;
    const displayPairs = truncated ? pairs.slice(0, MAX_LINES) : pairs;

    return (
        <div id={`diff-${fileKey}`} className="border-b border-slate-700/50">
            {/* Sticky file header */}
            <div className="sticky top-0 z-10 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/50 px-4 py-2 flex items-center gap-2">
                <span className="text-xs font-mono text-slate-300">{diff.file_path}</span>
                {diff.is_new && (
                    <span className="text-[10px] text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">New</span>
                )}
                {diff.is_deleted && (
                    <span className="text-[10px] text-red-400 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/30">Deleted</span>
                )}
            </div>

            {/* Side-by-side diff */}
            <div className="grid grid-cols-2 text-[12px] font-mono leading-[1.6] overflow-x-auto">
                {/* Left: old */}
                <div className="border-r border-slate-700/30">
                    {displayPairs.map((pair, i) => (
                        <div
                            key={i}
                            className={`flex min-h-[1.6em] ${pair.left.type === 'remove'
                                ? 'bg-red-500/10'
                                : pair.left.type === 'empty'
                                    ? 'bg-slate-700/10'
                                    : ''
                                }`}
                        >
                            <span className="w-10 shrink-0 text-right pr-2 text-slate-600 select-none text-[11px]">
                                {pair.left.oldLine ?? ''}
                            </span>
                            <span className="w-4 shrink-0 text-center text-slate-600 select-none">
                                {pair.left.type === 'remove' ? '−' : ' '}
                            </span>
                            <pre className="flex-1 whitespace-pre-wrap break-all pr-2">
                                {highlightLine(pair.left.content, lang)}
                            </pre>
                        </div>
                    ))}
                </div>
                {/* Right: new */}
                <div>
                    {displayPairs.map((pair, i) => (
                        <div
                            key={i}
                            className={`flex min-h-[1.6em] ${pair.right.type === 'add'
                                ? 'bg-emerald-500/10'
                                : pair.right.type === 'empty'
                                    ? 'bg-slate-700/10'
                                    : ''
                                }`}
                        >
                            <span className="w-10 shrink-0 text-right pr-2 text-slate-600 select-none text-[11px]">
                                {pair.right.newLine ?? ''}
                            </span>
                            <span className="w-4 shrink-0 text-center text-slate-600 select-none">
                                {pair.right.type === 'add' ? '+' : ' '}
                            </span>
                            <pre className="flex-1 whitespace-pre-wrap break-all pr-2">
                                {highlightLine(pair.right.content, lang)}
                            </pre>
                        </div>
                    ))}
                </div>
            </div>

            {truncated && (
                <div className="px-4 py-2 text-center text-xs text-slate-500 bg-slate-800/50">
                    ... {pairs.length - MAX_LINES} more lines not shown ...
                </div>
            )}
        </div>
    );
};


// ==================== ChangedFilesPanel ====================

interface ChangedFilesPanelProps {
    projects: ProjectStatus[];
    focusProject?: string | null;
}

export const ChangedFilesPanel: FC<ChangedFilesPanelProps> = ({
    projects,
    focusProject,
}) => {
    const { t } = useTranslation();
    const [allFiles, setAllFiles] = useState<
        Array<ChangedFile & { projectName: string }>
    >([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [diffs, setDiffs] = useState<Map<string, FileDiff>>(new Map());
    const [loadingDiffs, setLoadingDiffs] = useState<Set<string>>(new Set());
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
    const [treeWidth, setTreeWidth] = useState(280);
    const diffContainerRef = useRef<HTMLDivElement>(null);
    const resizingRef = useRef(false);

    const totalChanges = projects.reduce(
        (sum, p) => sum + p.uncommitted_count,
        0
    );

    // Load all changed files
    useEffect(() => {
        if (totalChanges === 0) return;

        let cancelled = false;
        setLoadingFiles(true);

        const load = async () => {
            const results: Array<ChangedFile & { projectName: string }> = [];
            await Promise.all(
                projects.map(async (p) => {
                    if (p.uncommitted_count === 0) return;
                    try {
                        const files = await getChangedFiles(p.path);
                        if (!cancelled) {
                            for (const f of files) {
                                results.push({ ...f, projectName: p.name });
                            }
                        }
                    } catch (e) {
                        console.error(`Failed to get changed files for ${p.name}:`, e);
                    }
                })
            );

            if (!cancelled) {
                setAllFiles(results);
                setLoadingFiles(false);

                // Initialize expanded paths
                const paths = new Set<string>();
                for (const f of results) {
                    const parts = [f.projectName, ...f.path.split('/')];
                    for (let i = 1; i < parts.length; i++) {
                        paths.add(parts.slice(0, i).join('/'));
                    }
                }
                setExpandedPaths(paths);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [projects, totalChanges]);

    // Load diff for a selected file
    const loadDiff = useCallback(
        async (projectName: string, filePath: string, key: string) => {
            if (diffs.has(key)) {
                setSelectedFile(key);
                // Scroll to diff
                setTimeout(() => {
                    const el = document.getElementById(`diff-${CSS.escape(key)}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);
                return;
            }

            const project = projects.find((p) => p.name === projectName);
            if (!project) return;

            setLoadingDiffs((prev) => new Set(prev).add(key));
            setSelectedFile(key);

            try {
                const diff = await getFileDiff(project.path, filePath);
                setDiffs((prev) => new Map(prev).set(key, diff));
                setTimeout(() => {
                    const el = document.getElementById(`diff-${CSS.escape(key)}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);
            } catch (e) {
                console.error('Failed to load diff:', e);
            } finally {
                setLoadingDiffs((prev) => {
                    const next = new Set(prev);
                    next.delete(key);
                    return next;
                });
            }
        },
        [diffs, projects]
    );

    const handleSelectFile = useCallback(
        (projectName: string, filePath: string, key: string) => {
            loadDiff(projectName, filePath, key);
        },
        [loadDiff]
    );

    const handleToggleExpand = useCallback((path: string) => {
        setExpandedPaths((prev) => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    }, []);

    // Load all diffs at once
    const loadAllDiffs = useCallback(async () => {
        const toLoad = allFiles.filter((f) => {
            const key = `${f.projectName}/${f.path}`;
            return !diffs.has(key) && f.status !== 'D';
        });

        if (toLoad.length === 0) return;

        const keys = toLoad.map((f) => `${f.projectName}/${f.path}`);
        setLoadingDiffs(new Set(keys));

        await Promise.all(
            toLoad.map(async (f) => {
                const project = projects.find((p) => p.name === f.projectName);
                if (!project) return;
                const key = `${f.projectName}/${f.path}`;
                try {
                    const diff = await getFileDiff(project.path, f.path);
                    setDiffs((prev) => new Map(prev).set(key, diff));
                } catch (e) {
                    console.error(`Failed to load diff for ${f.path}:`, e);
                } finally {
                    setLoadingDiffs((prev) => {
                        const next = new Set(prev);
                        next.delete(key);
                        return next;
                    });
                }
            })
        );
    }, [allFiles, diffs, projects]);

    // Auto-load all diffs once files are fetched
    useEffect(() => {
        if (allFiles.length > 0 && !loadingFiles && diffs.size === 0) {
            loadAllDiffs();
        }
    }, [allFiles, loadingFiles]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-focus on a specific project's first file when focusProject is set
    useEffect(() => {
        if (!focusProject || allFiles.length === 0 || loadingFiles) return;
        const projectFiles = allFiles.filter(f => f.projectName === focusProject);
        if (projectFiles.length === 0) return;
        const firstFile = projectFiles[0];
        const key = `${firstFile.projectName}/${firstFile.path}`;
        // If diff is already loaded, just select and scroll
        if (diffs.has(key)) {
            setSelectedFile(key);
            setTimeout(() => {
                const el = document.getElementById(`diff-${CSS.escape(key)}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } else {
            // Load diff then scroll
            loadDiff(firstFile.projectName, firstFile.path, key);
        }
    }, [focusProject, allFiles, loadingFiles, diffs.size]); // eslint-disable-line react-hooks/exhaustive-deps

    // Resize handler for tree panel
    const handleMouseDown = useCallback(() => {
        resizingRef.current = true;
        const handleMouseMove = (e: MouseEvent) => {
            if (!resizingRef.current) return;
            setTreeWidth((prev) => Math.max(200, Math.min(500, prev + e.movementX)));
        };
        const handleMouseUp = () => {
            resizingRef.current = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, []);

    const tree = buildTree(allFiles);

    if (totalChanges === 0) return null;

    return (
        <div className="h-full flex flex-col">
            {/* Header bar */}
            <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-slate-700/50 bg-slate-800/30">
                <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span className="text-sm font-medium text-slate-300">
                    {t('detail.changedFiles', 'Changed Files')}
                </span>
                <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full">
                    {totalChanges}
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 text-[11px] text-blue-400 hover:text-blue-300"
                    onClick={loadAllDiffs}
                >
                    {t('detail.loadAllDiffs', 'Load All Diffs')}
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 flex">
                {/* File tree sidebar */}
                <div
                    className="shrink-0 border-r border-slate-700/50 overflow-y-auto bg-slate-800/30"
                    style={{ width: `${treeWidth}px` }}
                >
                    {loadingFiles ? (
                        <div className="flex items-center justify-center py-8">
                            <svg
                                className="w-5 h-5 text-slate-500 animate-spin"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <circle
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeDasharray="60"
                                    strokeDashoffset="15"
                                />
                            </svg>
                        </div>
                    ) : (
                        <div className="py-1">
                            {/* Summary */}
                            <div className="px-3 py-1.5 flex items-center gap-2 text-[11px] text-slate-500 border-b border-slate-700/30 mb-1">
                                {['M', 'A', 'D', '?'].map((s) => {
                                    const count = allFiles.filter((f) => f.status === s).length;
                                    if (count === 0) return null;
                                    return (
                                        <span
                                            key={s}
                                            className={`px-1.5 py-0.5 rounded border ${STATUS_BG[s] || 'bg-slate-700/30 border-slate-700'}`}
                                        >
                                            <span className={STATUS_COLORS[s]}>{count}</span>{' '}
                                            <span className="text-slate-500">
                                                {STATUS_LABELS[s]}
                                            </span>
                                        </span>
                                    );
                                })}
                            </div>
                            {Array.from(tree.children.values())
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((child) => (
                                    <FileTreeItem
                                        key={child.path}
                                        node={child}
                                        depth={0}
                                        selectedFile={selectedFile}
                                        onSelect={handleSelectFile}
                                        expandedPaths={expandedPaths}
                                        onToggleExpand={handleToggleExpand}
                                    />
                                ))}
                        </div>
                    )}
                </div>

                {/* Resize handle */}
                <div
                    className="w-1 shrink-0 cursor-col-resize hover:bg-blue-500/30 active:bg-blue-500/50 transition-colors"
                    onMouseDown={handleMouseDown}
                />

                {/* Diff content */}
                <div className="flex-1 overflow-y-auto" ref={diffContainerRef}>
                    {diffs.size === 0 && loadingDiffs.size === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
                            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            <p className="text-sm">{t('detail.selectFileToDiff', 'Select a file to view diff')}</p>
                        </div>
                    ) : (
                        <div>
                            {Array.from(diffs.entries()).map(([key, diff]) => (
                                <DiffView key={key} diff={diff} fileKey={key} />
                            ))}
                            {loadingDiffs.size > 0 && (
                                <div className="flex items-center justify-center py-4 gap-2 text-slate-500">
                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="60" strokeDashoffset="15" />
                                    </svg>
                                    <span className="text-xs">Loading {loadingDiffs.size} diff(s)...</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
