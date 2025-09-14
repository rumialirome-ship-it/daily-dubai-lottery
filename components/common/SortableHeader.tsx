import React from 'react';

const SortableHeader: React.FC<{
    children: React.ReactNode;
    onClick: (sortKey: string) => void;
    sortKey: string;
    currentSort: string;
    direction: 'asc' | 'desc';
}> = ({ children, onClick, sortKey, currentSort, direction }) => (
    <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => onClick(sortKey)}>
        {children}
        {currentSort === sortKey && (direction === 'asc' ? ' ▲' : ' ▼')}
    </th>
);

export default SortableHeader;