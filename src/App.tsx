import { useState } from 'react';
import { TreeView, type TreeDataItem } from '@/components/tree-view';

const data: TreeDataItem[] = [
  {
    id: '1',
    name: 'Item 1',
    children: [
      {
        id: '2',
        name: 'Item 1.1',
        children: [
          {
            id: '3',
            name: 'Item 1.1.1',
          },
          {
            id: '4',
            name: 'Item 1.1.2',
          },
        ],
      },
      {
        id: '5',
        name: 'Item 1.2',
      },
    ],
  },
  {
    id: '6',
    name: 'Item 2',
    children: [
      {
        id: '7',
        name: 'Item 2.1',
      },
      {
        id: '8',
        name: 'Item 2.2',
        children: [
          {
            id: '9',
            name: 'Item 2.2.1',
          },
          {
            id: '10',
            name: 'Item 2.2.2',
          },
        ],
      },
    ],
  },
];

const App: React.FC = () => {
  const [selected, setSelected] = useState<string>('');
  return (
    <>
      <TreeView data={data} onSelectChange={(item) => setSelected(item?.name || '')} />
      <h3>Selected: {selected || 'Nothing'}</h3>
    </>
  );
};

export default App;
