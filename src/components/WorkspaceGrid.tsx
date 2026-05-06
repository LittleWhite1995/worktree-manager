import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CellContext } from '../contexts/CellContext';
import { WorkspaceCell } from './WorkspaceCell';
import { PlusIcon } from './Icons';

interface GridCellState {
  id: string;
  initialWorkspacePath: string;
}

type GridState = GridCellState[][];

function isCellClosable(grid: GridState, r: number, c: number): boolean {
  if (r === 0 && c === 0) return false;
  if (grid[r].length === 3 && c === 1) return false;
  if (c === 0 && grid.length === 3 && r === 1) return false;
  return true;
}

interface WorkspaceGridProps {
  currentWorkspacePath: string;
}

export function WorkspaceGrid({ currentWorkspacePath }: WorkspaceGridProps) {
  const { t } = useTranslation();
  const [grid, setGrid] = useState<GridState>(() => [[
    { id: '0-0', initialWorkspacePath: currentWorkspacePath },
  ]]);

  const totalCells = grid.reduce((sum, row) => sum + row.length, 0);

  const addCellToRow = useCallback((rowIndex: number) => {
    setGrid(prev => {
      const row = prev[rowIndex];
      if (row.length >= 3) return prev;
      const lastCell = row[row.length - 1];
      const colIndex = row.length;
      const newCell: GridCellState = {
        id: `${rowIndex}-${colIndex}`,
        initialWorkspacePath: lastCell.initialWorkspacePath,
      };
      return prev.map((r, i) => i === rowIndex ? [...r, newCell] : r);
    });
  }, []);

  const addRow = useCallback(() => {
    setGrid(prev => {
      if (prev.length >= 3) return prev;
      const lastRow = prev[prev.length - 1];
      const rowIndex = prev.length;
      const newCell: GridCellState = {
        id: `${rowIndex}-0`,
        initialWorkspacePath: lastRow[0].initialWorkspacePath,
      };
      return [...prev, [newCell]];
    });
  }, []);

  const closeCell = useCallback((rowIndex: number, colIndex: number) => {
    setGrid(prev => {
      const newGrid = prev.map((row, r) => {
        if (r !== rowIndex) return row;
        return row.filter((_, c) => c !== colIndex);
      }).filter(row => row.length > 0);

      return newGrid.map((row, r) =>
        row.map((cell, c) => ({ ...cell, id: `${r}-${c}` }))
      );
    });
  }, []);

  return (
    <div className="h-screen bg-slate-900 text-slate-100 flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col">
        {grid.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="flex-1 min-h-0 flex"
            style={rowIndex > 0 ? { borderTop: '1px solid rgb(51 65 85)' } : undefined}
          >
            {row.map((cell, colIndex) => {
              const closable = isCellClosable(grid, rowIndex, colIndex);
              return (
                <CellContext.Provider
                  key={cell.id}
                  value={{ cellId: cell.id, isPrimary: cell.id === '0-0' }}
                >
                  <div
                    className="flex-1 min-w-0 group/cell relative"
                    style={colIndex > 0 ? { borderLeft: '1px solid rgb(51 65 85)' } : undefined}
                  >
                    <WorkspaceCell
                      initialWorkspacePath={cell.initialWorkspacePath}
                      closable={closable}
                      onClose={closable ? () => closeCell(rowIndex, colIndex) : undefined}
                    />
                  </div>
                </CellContext.Provider>
              );
            })}

            {row.length < 3 && (
              <button
                onClick={() => addCellToRow(rowIndex)}
                className={`shrink-0 flex items-center justify-center transition-colors text-slate-600 hover:text-slate-400 hover:bg-slate-800/50 ${
                  totalCells === 1 ? 'w-5 opacity-40 hover:opacity-100' : 'w-7'
                }`}
                title={t('grid.addColumn')}
              >
                <PlusIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {grid.length < 3 && (
        <button
          onClick={addRow}
          className={`shrink-0 flex items-center justify-center transition-colors text-slate-600 hover:text-slate-400 hover:bg-slate-800/50 ${
            totalCells === 1 ? 'h-5 opacity-40 hover:opacity-100' : 'h-7'
          }`}
          title={t('grid.addRow')}
        >
          <PlusIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
