import React, { useState, useEffect, useCallback } from 'react';
import { Form, InputGroup } from 'react-bootstrap';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onSubmit?: (query: string) => void;
  initialValue?: string;
  debounceTime?: number;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  onSubmit,
  initialValue = '', 
  debounceTime = 50 
}) => {
  const [query, setQuery] = useState(initialValue);
  
  const debouncedSearch = useCallback(
    debounce((searchQuery: string) => {
      onSearch(searchQuery);
    }, debounceTime),
    [onSearch, debounceTime]
  );

  useEffect(() => {
    debouncedSearch(query);
    return () => debouncedSearch.cancel();
  }, [query, debouncedSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // If onSubmit is provided, use it, otherwise fall back to onSearch
    if (onSubmit) {
      onSubmit(query);
    } else {
      onSearch(query);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  return (
    <Form onSubmit={handleSubmit} className="mb-4">
      <InputGroup>
        <Form.Control
          type="text"
          placeholder="Search my recipes..."
          value={query}
          onChange={handleInputChange}
          aria-label="Search recipes"
        />
      </InputGroup>
    </Form>
  );
};

// Debounce utility function
const debounce = <F extends (...args: any[]) => any>(
  func: F,
  wait: number
) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
  
  debounced.cancel = () => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  
  return debounced as F & { cancel: () => void };
};

export default SearchBar;
