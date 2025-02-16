'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DataTableFilterProps {
  title: string;
  options: {
    label: string;
    value: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
  value: string[];
  onChange: (value: string[]) => void;
  theme?: 'light' | 'dark';
}

export function DataTableFilter({
  title,
  options,
  value,
  onChange,
  theme = 'light',
}: DataTableFilterProps) {
  const [open, setOpen] = React.useState(false);
  const selectedValues = new Set(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className={`h-9 border-dashed ${
            theme === 'dark'
              ? 'bg-white/[0.07] border-white/[0.1] text-white hover:bg-white/[0.1] hover:text-white'
              : ''
          }`}
        >
          <span>{title}</span>
          {selectedValues.size > 0 && (
            <div className="ml-2 rounded-sm bg-primary/10 px-1 font-mono text-xs">
              {selectedValues.size}
            </div>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${title.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No {title.toLowerCase()} found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      const newValues = new Set(selectedValues);
                      if (isSelected) {
                        newValues.delete(option.value);
                      } else {
                        newValues.add(option.value);
                      }
                      onChange(Array.from(newValues));
                    }}
                  >
                    <div
                      className={cn(
                        'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-black',
                        isSelected
                          ? 'bg-black text-white'
                          : 'bg-transparent hover:border-black',
                        theme === 'dark' &&
                          !isSelected &&
                          'border-black hover:border-black'
                      )}
                    >
                      <Check
                        className={cn(
                          'h-4 w-4',
                          isSelected ? 'text-white' : 'invisible'
                        )}
                      />
                    </div>
                    {option.icon && (
                      <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
