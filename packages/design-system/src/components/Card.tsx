import type { HTMLAttributes } from 'react';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      className={['rounded-2xl bg-white shadow-md border border-slate-200 p-6', className].join(' ')}
      {...props}
    />
  );
}
