// Polyfill for Unicode Property Escapes in RegExp
import rewritePattern from 'regexpu-core';
if (!RegExp.prototype.unicode) {
  const OriginalRegExp = RegExp;
  RegExp = function (pattern, flags) {
    if (typeof flags === 'string' && flags.includes('u')) {
      return new OriginalRegExp(
        rewritePattern(pattern, { unicodePropertyEscape: true }),
        flags.replace('u', '')
      );
    }
    return new OriginalRegExp(pattern, flags);
  };
  RegExp.prototype = OriginalRegExp.prototype;
}

// Polyfill for Node.js environments to handle browser-like `self`
if (typeof self === 'undefined') {
  global.self = global;
}

// Import Lunr and its Japanese plugin
import lunr from 'lunr';

// Import 'createRequire' to allow requiring CommonJS modules
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import Lunr languages using require (CommonJS modules)
const lunrStemmerSupport = require('lunr-languages/lunr.stemmer.support');
const tinyseg = require('lunr-languages/tinyseg');
const lunrJa = require('lunr-languages/lunr.ja');

// Initialize Lunr plugins
lunrStemmerSupport(lunr);
tinyseg(lunr);
lunrJa(lunr);

// Set the global tokenizer to the Japanese tokenizer
lunr.tokenizer = lunr.ja.tokenizer;

// Prevent unnecessary imports in Node.js
if (typeof window !== 'undefined' && typeof self !== 'undefined') {
  import('react-devtools-core');
}

// Import UI libraries
import { TextInput } from '@inkjs/ui';
import React, { useMemo, useState } from 'react';
import { render, useFocus, Box, Text } from 'ink';

// Main Application
const Home = () => {
  const [queryString, setQueryString] = useState('');
  const [docs, setDocs] = useState({});

  const handleAddDoc = (body) => {
    setDocs((docs) => ({
      ...docs,
      [`Document ${Object.keys(docs).length + 1}`]: body,
    }));
  };

  return (
    <Box flexDirection="column">
      <Text>Use tab to move around and press Enter to select or confirm.</Text>
      <Index onAddDoc={handleAddDoc} docsIndexed={Object.keys(docs).length} />
      <Query query={queryString} onQueryChange={setQueryString} />
      <Search query={queryString} docs={docs} />
    </Box>
  );
};

// Component to Index Documents
const Index = ({ onAddDoc, docsIndexed }) => {
  const { isFocused } = useFocus({ autoFocus: true });
  return (
    <Box gap={2} flexDirection="row">
      <Text inverse={isFocused}>Index a document</Text>
      {isFocused ? (
        <TextInput
          key={docsIndexed}
          placeholder="Enter or paste a Japanese string and press Enter…"
          isDisabled={!isFocused}
          onSubmit={(val) => {
            onAddDoc(val);
          }}
        />
      ) : (
        <Text>Press Tab to focus</Text>
      )}
    </Box>
  );
};

// Component to Handle Query Input
const Query = ({ query, onQueryChange }) => {
  const { isFocused } = useFocus();
  return (
    <Box gap={2} flexDirection="row">
      <Text inverse={isFocused}>Search documents</Text>
      <TextInput
        isDisabled={!isFocused}
        placeholder="Enter search query…"
        value={query}
        onChange={onQueryChange}
      />
    </Box>
  );
};

// Component to Perform Search
const Search = ({ query, docs }) => {
  const lunrIndex = useMemo(() => {
    try {
      // Create a Lunr index with Japanese language support
      return lunr(function () {
        // Use the Japanese language plugin
        this.use(lunr.ja);

        // Setup reference and field
        this.ref('name');
        this.field('body');

        // Add documents to the index
        for (const [name, body] of Object.entries(docs)) {
          this.add({ name, body });
        }
      });
    } catch (error) {
      console.error('Error initializing Lunr index:', error);
      return null;
    }
  }, [docs]);

  const [searchData, setSearchData] = useState({
    results: [],
    error: null,
    tokens: [],
  });

  useMemo(() => {
    if (!lunrIndex || !query.trim()) {
      setSearchData({
        results: [],
        error: null,
        tokens: [],
      });
      return;
    }

    try {
      // Tokenize the query using lunr.tokenizer
      const tokens = lunr.tokenizer(query.trim()).map((token) => token.toString());

      // Use Lunr's query builder to search
      const results = lunrIndex.query((q) => {
        tokens.forEach((token) => {
          q.term(token, {
            wildcard: lunr.Query.wildcard.TRAILING,
          });
        });
      }) ?? [];

      setSearchData({
        results,
        error: null,
        tokens,
      });
    } catch (e) {
      console.error('Error searching:', e);
      setSearchData({
        results: [],
        error: e instanceof Error ? e.message : 'Unknown error occurred',
        tokens: [],
      });
    }
  }, [lunrIndex, query]);

  const { results, error, tokens } = searchData;

  return (
    <Box flexDirection="column" marginTop={1}>
      {error ? (
        <Text color="red">Error searching: {error}</Text>
      ) : query.trim() !== '' ? (
        <Box flexDirection="column">
          <Text>
            {results.length} document{results.length === 1 ? '' : 's'} matched
          </Text>
          <Box>
            <Text bold>Query: </Text>
            <Text>{query}</Text>
          </Box>
          {tokens.length > 0 && (
            <Box>
              <Text bold>Tokens: </Text>
              <Text>{tokens.join(', ')}</Text>
            </Box>
          )}
        </Box>
      ) : (
        <Text>
          {Object.keys(docs).length} document
          {Object.keys(docs).length === 1 ? '' : 's'} indexed
        </Text>
      )}
      <Box flexDirection="column" marginTop={1}>
        {results.map((res) => (
          <Result key={res.ref} name={res.ref} body={docs[res.ref]} />
        ))}
      </Box>
    </Box>
  );
};

// Component to Display Search Results and Document Tokens
const Result = ({ name, body }) => {
  const { isFocused } = useFocus();
  const docTokens = useMemo(() => {
    // Use the global Japanese tokenizer for tokenization
    return lunr.tokenizer(body).map((token) => token.toString());
  }, [body]);

  return (
    <Box flexDirection="column" gap={1}>
      <Box gap={2}>
        <Text inverse={isFocused}>{name}</Text>
        {isFocused && <Text>{body}</Text>}
      </Box>
      {isFocused && docTokens.length > 0 && (
        <Box flexDirection="column" marginLeft={2}>
          <Text bold>Document Tokens:</Text>
          <Text>{docTokens.join(', ')}</Text>
        </Box>
      )}
    </Box>
  );
};

// Render the Application
render(<Home />);
