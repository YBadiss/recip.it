import React, { useState } from 'react';
import { Form, InputGroup, Button } from 'react-bootstrap';

interface SearchBarProps {
  onSearch: (query: string) => void;
  initialValue?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, initialValue = '' }) => {
  const [query, setQuery] = useState(initialValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <Form onSubmit={handleSubmit} className="mb-4">
      <InputGroup>
        <Form.Control
          type="text"
          placeholder="Search recipes..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search recipes"
        />
        <Button type="submit" variant="success">
          Search
        </Button>
      </InputGroup>
    </Form>
  );
};

export default SearchBar;
