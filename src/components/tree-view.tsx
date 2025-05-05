import React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronRight } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const treeVariants = cva(
  'group hover:before:opacity-100 before:absolute before:rounded-lg before:left-0 px-2 before:w-full before:opacity-0 before:bg-accent/70 before:h-[2rem] before:-z-10',
);

const selectedTreeVariants = cva('before:opacity-100 before:bg-accent/70 text-accent-foreground');

const dragOverVariants = cva('before:opacity-100 before:bg-primary/20 text-primary-foreground');

interface TreeDataItem {
  id: string;
  name: string;
  icon?: any;
  selectedIcon?: any;
  openIcon?: any;
  children?: TreeDataItem[];
  actions?: React.ReactNode;
  onClick?: () => void;
  draggable?: boolean;
  droppable?: boolean;
  parent?: TreeDataItem;
}

type TreeProps = React.HTMLAttributes<HTMLDivElement> & {
  data: TreeDataItem[] | TreeDataItem;
  initialSelectedItemId?: string;
  onSelectChange?: (item: TreeDataItem | undefined) => void;
  expandAll?: boolean;
  defaultNodeIcon?: any;
  defaultLeafIcon?: any;
  onDocumentDrag?: (sourceItem: TreeDataItem, targetItem: TreeDataItem) => void;
};

const TreeView = React.forwardRef<HTMLDivElement, TreeProps>(
  (
    {
      data,
      initialSelectedItemId,
      onSelectChange,
      expandAll,
      defaultLeafIcon,
      defaultNodeIcon,
      className,
      onDocumentDrag,
      ...props
    },
    ref,
  ) => {
    const [selectedItemId, setSelectedItemId] = React.useState<string | undefined>(
      initialSelectedItemId,
    );
    const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

    const processedData = React.useMemo(() => {
      const processItems = (
        items: TreeDataItem[] | TreeDataItem,
        parent?: TreeDataItem,
      ): TreeDataItem[] | TreeDataItem => {
        if (items instanceof Array) {
          return items.map((item) => {
            const newItem = { ...item, parent };
            if (item.children) {
              newItem.children = processItems(item.children, newItem) as TreeDataItem[];
            }
            return newItem;
          });
        } else {
          const newItem = { ...items, parent };
          if (items.children) {
            newItem.children = processItems(items.children, newItem) as TreeDataItem[];
          }
          return newItem;
        }
      };
      return processItems(data);
    }, [data]);

    const flatNodePointers: Record<string, TreeDataItem> = React.useMemo(() => {
      const flatData: Record<string, TreeDataItem> = {};

      const flattenTree = (items: TreeDataItem[] | TreeDataItem) => {
        if (items instanceof Array) {
          items.forEach((item) => flattenTree(item));
        } else {
          flatData[items.id] = items;
          if (items.children) {
            flattenTree(items.children);
          }
        }
      };
      flattenTree(processedData);
      return flatData;
    }, [processedData]);

    const handleToggleExpand = (itemId: string, isExpanded: boolean) => {
      setExpandedItems((prev) => {
        if (isExpanded) {
          return [...prev, itemId];
        } else {
          return prev.filter((id) => id !== itemId);
        }
      });
    };

    const handleTreeKeyboardNavigation = (e: React.KeyboardEvent) => {
      if (!selectedItemId) return;

      const currentNode = flatNodePointers[selectedItemId];
      if (!currentNode) return;

      const allNodes: TreeDataItem[] = [];
      const collectNodes = (items: TreeDataItem[] | TreeDataItem) => {
        if (items instanceof Array) {
          items.forEach((item) => {
            allNodes.push(item);
            if (item.children && expandedItems.includes(item.id)) {
              collectNodes(item.children);
            }
          });
        } else {
          allNodes.push(items);
          if (items.children && expandedItems.includes(items.id)) {
            collectNodes(items.children);
          }
        }
      };
      collectNodes(processedData);

      const currentIndex = allNodes.findIndex((node) => node.id === selectedItemId);
      if (currentIndex === -1) return;

      switch (e.key) {
        case 'ArrowDown': {
          if (currentIndex < allNodes.length - 1) {
            handleSelectChange(allNodes[currentIndex + 1]);
          }
          e.preventDefault();
          break;
        }
        case 'ArrowUp': {
          if (currentIndex > 0) {
            handleSelectChange(allNodes[currentIndex - 1]);
          }
          e.preventDefault();
          break;
        }
        case 'ArrowRight': {
          if (currentNode.children && currentNode.children.length > 0) {
            if (!expandedItems.includes(currentNode.id)) {
              handleToggleExpand(currentNode.id, true);
            } else {
              handleSelectChange(currentNode.children[0]);
            }
          }
          e.preventDefault();
          break;
        }
        case 'ArrowLeft': {
          if (expandedItems.includes(currentNode.id)) {
            handleToggleExpand(currentNode.id, false);
          } else if (currentNode.parent) {
            handleSelectChange(currentNode.parent);
          }
          e.preventDefault();
          break;
        }
      }
    };

    const [draggedItem, setDraggedItem] = React.useState<TreeDataItem | null>(null);

    const handleSelectChange = React.useCallback(
      (item: TreeDataItem | undefined) => {
        setSelectedItemId(item?.id);
        if (onSelectChange) {
          onSelectChange(item);
        }
      },
      [onSelectChange],
    );

    const handleDragStart = React.useCallback((item: TreeDataItem) => {
      setDraggedItem(item);
    }, []);

    const handleDrop = React.useCallback(
      (targetItem: TreeDataItem) => {
        if (draggedItem && onDocumentDrag && draggedItem.id !== targetItem.id) {
          onDocumentDrag(draggedItem, targetItem);
        }
        setDraggedItem(null);
      },
      [draggedItem, onDocumentDrag],
    );

    React.useEffect(() => {
      if (!initialSelectedItemId || expandAll) return;

      const ids: string[] = [];
      const walkTreeItems = (items: TreeDataItem[] | TreeDataItem, targetId: string): boolean => {
        if (items instanceof Array) {
          for (let i = 0; i < items.length; i++) {
            if (walkTreeItems(items[i]!, targetId)) {
              ids.push(items[i]!.id);
              return true;
            }
          }
          return false;
        } else if (items.id === targetId) {
          return true;
        } else if (items.children) {
          if (walkTreeItems(items.children, targetId)) {
            ids.push(items.id);
            return true;
          }
        }
        return false;
      };

      walkTreeItems(processedData, initialSelectedItemId);
      if (ids.length > 0) {
        setExpandedItems(ids);
      }
    }, [initialSelectedItemId, processedData, expandAll]);

    return (
      <div className={cn('overflow-hidden relative p-2', className)}>
        <TreeItem
          data={processedData}
          ref={ref}
          selectedItemId={selectedItemId}
          handleSelectChange={handleSelectChange}
          expandedItems={expandedItems}
          handleToggleExpand={handleToggleExpand}
          defaultLeafIcon={defaultLeafIcon}
          defaultNodeIcon={defaultNodeIcon}
          handleDragStart={handleDragStart}
          handleDrop={handleDrop}
          draggedItem={draggedItem}
          onKeyDown={handleTreeKeyboardNavigation}
          {...props}
        />
        <div
          className="w-full h-[48px]"
          onDrop={(e) => {
            e.preventDefault();
            handleDrop({ id: '', name: 'parent_div' });
          }}
        ></div>
      </div>
    );
  },
);
TreeView.displayName = 'TreeView';

type TreeItemProps = TreeProps & {
  selectedItemId?: string;
  handleSelectChange: (item: TreeDataItem | undefined) => void;
  expandedItems: string[];
  handleToggleExpand: (itemId: string, isExpanded: boolean) => void;
  defaultNodeIcon?: any;
  defaultLeafIcon?: any;
  handleDragStart?: (item: TreeDataItem) => void;
  handleDrop?: (item: TreeDataItem) => void;
  draggedItem: TreeDataItem | null;
};

const TreeItem = React.forwardRef<HTMLDivElement, TreeItemProps>(
  (
    {
      className,
      data,
      selectedItemId,
      handleSelectChange,
      expandedItems,
      handleToggleExpand,
      defaultNodeIcon,
      defaultLeafIcon,
      handleDragStart,
      handleDrop,
      draggedItem,
      ...props
    },
    ref,
  ) => {
    if (!(data instanceof Array)) {
      data = [data];
    }
    return (
      <div ref={ref} role="tree" className={className} {...props} tabIndex={0}>
        <ul>
          {data.map((item) => (
            <li key={item.id}>
              {item.children ? (
                <TreeNode
                  item={item}
                  selectedItemId={selectedItemId}
                  expandedItems={expandedItems}
                  handleToggleExpand={handleToggleExpand}
                  handleSelectChange={handleSelectChange}
                  defaultNodeIcon={defaultNodeIcon}
                  defaultLeafIcon={defaultLeafIcon}
                  handleDragStart={handleDragStart}
                  handleDrop={handleDrop}
                  draggedItem={draggedItem}
                />
              ) : (
                <TreeLeaf
                  item={item}
                  selectedItemId={selectedItemId}
                  handleSelectChange={handleSelectChange}
                  defaultLeafIcon={defaultLeafIcon}
                  handleDragStart={handleDragStart}
                  handleDrop={handleDrop}
                  draggedItem={draggedItem}
                />
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  },
);
TreeItem.displayName = 'TreeItem';

const TreeNode = ({
  item,
  handleSelectChange,
  expandedItems,
  handleToggleExpand: handleNodeToggleExpand,
  selectedItemId,
  defaultNodeIcon,
  defaultLeafIcon,
  handleDragStart,
  handleDrop,
  draggedItem,
}: {
  item: TreeDataItem;
  handleSelectChange: (item: TreeDataItem | undefined) => void;
  expandedItems: string[];
  handleToggleExpand: (itemId: string, isExpanded: boolean) => void;
  selectedItemId?: string;
  defaultNodeIcon?: any;
  defaultLeafIcon?: any;
  handleDragStart?: (item: TreeDataItem) => void;
  handleDrop?: (item: TreeDataItem) => void;
  draggedItem: TreeDataItem | null;
}) => {
  const isExpanded = expandedItems.includes(item.id);
  const [value, setValue] = React.useState(isExpanded ? [item.id] : []);
  const [isDragOver, setIsDragOver] = React.useState(false);

  React.useEffect(() => {
    const newValue = expandedItems.includes(item.id) ? [item.id] : [];
    setValue(newValue);
  }, [expandedItems, item.id]);

  const syncExpandCollapseState = (values: string[]) => {
    setValue(values);
    const newIsExpanded = values.includes(item.id);
    if (newIsExpanded !== isExpanded) {
      handleNodeToggleExpand(item.id, newIsExpanded);
    }
  };

  const onDragStart = (e: React.DragEvent) => {
    if (!item.draggable) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', item.id);
    handleDragStart?.(item);
  };

  const onDragOver = (e: React.DragEvent) => {
    if (item.droppable !== false && draggedItem && draggedItem.id !== item.id) {
      e.preventDefault();
      setIsDragOver(true);
    }
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleDrop?.(item);
  };

  return (
    <AccordionPrimitive.Root type="multiple" value={value} onValueChange={syncExpandCollapseState}>
      <AccordionPrimitive.Item value={item.id}>
        <AccordionTrigger
          className={cn(
            treeVariants(),
            selectedItemId === item.id && selectedTreeVariants(),
            isDragOver && dragOverVariants(),
          )}
          onClick={() => {
            handleSelectChange(item);
            item.onClick?.();
          }}
          draggable={!!item.draggable}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <TreeIcon
            item={item}
            isSelected={selectedItemId === item.id}
            isOpen={value.includes(item.id)}
            default={defaultNodeIcon}
          />
          <span className="text-sm truncate">{item.name}</span>
          <TreeActions isSelected={selectedItemId === item.id}>{item.actions}</TreeActions>
        </AccordionTrigger>
        <AccordionContent className="ml-4 pl-1 border-l">
          <TreeItem
            data={item.children ? item.children : item}
            selectedItemId={selectedItemId}
            handleSelectChange={handleSelectChange}
            expandedItems={expandedItems}
            handleToggleExpand={handleNodeToggleExpand}
            defaultLeafIcon={defaultLeafIcon}
            defaultNodeIcon={defaultNodeIcon}
            handleDragStart={handleDragStart}
            handleDrop={handleDrop}
            draggedItem={draggedItem}
          />
        </AccordionContent>
      </AccordionPrimitive.Item>
    </AccordionPrimitive.Root>
  );
};

const TreeLeaf = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    item: TreeDataItem;
    selectedItemId?: string;
    handleSelectChange: (item: TreeDataItem | undefined) => void;
    defaultLeafIcon?: any;
    handleDragStart?: (item: TreeDataItem) => void;
    handleDrop?: (item: TreeDataItem) => void;
    draggedItem: TreeDataItem | null;
  }
>(
  (
    {
      className,
      item,
      selectedItemId,
      handleSelectChange,
      defaultLeafIcon,
      handleDragStart,
      handleDrop,
      draggedItem,
      ...props
    },
    ref,
  ) => {
    const [isDragOver, setIsDragOver] = React.useState(false);

    const onDragStart = (e: React.DragEvent) => {
      if (!item.draggable) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData('text/plain', item.id);
      handleDragStart?.(item);
    };

    const onDragOver = (e: React.DragEvent) => {
      if (item.droppable !== false && draggedItem && draggedItem.id !== item.id) {
        e.preventDefault();
        setIsDragOver(true);
      }
    };

    const onDragLeave = () => {
      setIsDragOver(false);
    };

    const onDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleDrop?.(item);
    };

    return (
      <div
        ref={ref}
        className={cn(
          'ml-5 flex text-left items-center py-2 cursor-pointer before:right-1',
          treeVariants(),
          className,
          selectedItemId === item.id && selectedTreeVariants(),
          isDragOver && dragOverVariants(),
        )}
        onClick={() => {
          handleSelectChange(item);
          item.onClick?.();
        }}
        draggable={!!item.draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        {...props}
      >
        <TreeIcon item={item} isSelected={selectedItemId === item.id} default={defaultLeafIcon} />
        <span className="flex-grow text-sm truncate">{item.name}</span>
        <TreeActions isSelected={selectedItemId === item.id}>{item.actions}</TreeActions>
      </div>
    );
  },
);
TreeLeaf.displayName = 'TreeLeaf';

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header>
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        'flex flex-1 w-full items-center py-2 transition-all first:[&[data-state=open]>svg]:rotate-90',
        className,
      )}
      {...props}
    >
      <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 text-accent-foreground/50 mr-1" />
      {children}
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn(
      'overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
      className,
    )}
    {...props}
  >
    <div className="pb-1 pt-0">{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

const TreeIcon = ({
  item,
  isOpen,
  isSelected,
  default: defaultIcon,
}: {
  item: TreeDataItem;
  isOpen?: boolean;
  isSelected?: boolean;
  default?: any;
}) => {
  let Icon = defaultIcon;
  if (isSelected && item.selectedIcon) {
    Icon = item.selectedIcon;
  } else if (isOpen && item.openIcon) {
    Icon = item.openIcon;
  } else if (item.icon) {
    Icon = item.icon;
  }
  return Icon ? <Icon className="h-4 w-4 shrink-0 mr-2" /> : <></>;
};

const TreeActions = ({
  children,
  isSelected,
}: {
  children: React.ReactNode;
  isSelected: boolean;
}) => {
  return (
    <div className={cn(isSelected ? 'block' : 'hidden', 'absolute right-3 group-hover:block')}>
      {children}
    </div>
  );
};

export { TreeView, type TreeDataItem };
