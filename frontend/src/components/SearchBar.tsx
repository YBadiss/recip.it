import React, { useState, useEffect, useRef } from 'react';
import { Form, InputGroup } from 'react-bootstrap';

interface SearchBarProps {
  onSearch: (query: string) => void; // Triggered on input change
  onSubmit: (query: string) => void; // Triggered on input submit
  initialValue?: string;
  className?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onSubmit,
  initialValue = '',
  className = '',
}) => {
  const [query, setQuery] = useState(initialValue);
  const initialValueRef = useRef(initialValue);

  // Only update local state if initialValue changes from external source (not from user typing)
  useEffect(() => {
    // Only update if initialValue has actually changed from previous value
    if (initialValue !== initialValueRef.current) {
      initialValueRef.current = initialValue;
      setQuery(initialValue);
    }
  }, [initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(query);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    onSearch(newQuery);
  };

  const handleClear = () => {
    setQuery('');
    onSearch(''); // Trigger search for empty string
  };

  // Intercept keyboard events to make sure Enter key always submits
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit(query);
    }
  };

  return (
    <Form onSubmit={handleSubmit} className={`search-bar-form ${className}`}>
      <InputGroup>
        <InputGroup.Text className="search-icon">
          <i className="bi bi-search"></i>
        </InputGroup.Text>
        <Form.Control
          type="text"
          placeholder="Search recipes..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          aria-label="Search recipes"
          className="search-input"
        />
        {query && (
          <InputGroup.Text className="clear-button" onClick={handleClear}>
            <i className="bi bi-x"></i>
          </InputGroup.Text>
        )}
      </InputGroup>
    </Form>
  );
};

export default SearchBar;
