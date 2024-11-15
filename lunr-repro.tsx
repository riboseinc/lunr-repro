// Set up Lunr

import lunr from 'lunr';
import { type Index as LunrIndex } from 'lunr';

import enableLunrStemmer from 'lunr-languages/lunr.stemmer.support';
import enableTinyLunrSegmenter from 'lunr-languages/tinyseg';
import enableLunrFr from 'lunr-languages/lunr.fr';
import enableLunrJa from 'lunr-languages/lunr.ja';

// These two must be done before enabling lunr.ja
// (cf. https://github.com/MihaiValentin/lunr-languages/issues/42):
enableTinyLunrSegmenter(lunr);
enableLunrStemmer(lunr);

enableLunrJa(lunr);

/**
 * Modify Lunr.js tokenizer to use N-gram segmentation.
 * Performance considerations:
 * - N-gram increases index size and search time. Adjust maxSize based on actual needs.
 * - Larger maxSize values improve matching precision but lead to larger index sizes.
 */
lunr.ja.tokenizer = function (obj) {
  if (!arguments.length || obj == null || obj === undefined) return [];

  let str = obj
    .toString()
    .toLowerCase()
    .replace(/^\s+/, "")
    .replace(/\s+$/, "");
  if (str.length === 0) return [];

  // Define the N-gram function
  const ngrams = (text, minSize = 1, maxSize = 15) => {
    let results: any[] = [];
    for (let size = minSize; size <= maxSize; size++) {
      for (let i = 0; i <= text.length - size; i++) {
        let token = text.substring(i, i + size);
        results.push({
          str: token,
          metadata: { position: [i, i + size - 1], index: i },
        });
      }
    }
    return results;
  };
  /**
   * maxSize is set to 15 by default, meaning the maximum search term length.
   * In most cases, 15 characters are enough for typical searches.
   * It can be increased up to str.length, which is the length of the indexed string.
   */
  const tokens = ngrams(str, 1, Math.min(15, str.length)); // Ensure maxSize does not exceed the string length

  return tokens.map(
    (tokenData) => new lunr.Token(tokenData.str, tokenData.metadata)
  );
};

// Show search UI

import { TextInput } from '@inkjs/ui';
import React, { useMemo, useState } from 'react';
import { render, useInput, useFocus, Box, Text } from 'ink';

const Home: React.FC<Record<never, never>> = function () {
  const [selectedMode, selectMode] = useState<'index' | 'query'>('index');
  const [isSelectingMode, setIsSelectingMode] = useState(false);
  const [queryString, setQueryString] = useState('');
  const [docs, setDocs] = useState<Record<string, string>>({});
  
  function handleAddDoc(body: string) {
    setDocs(docs => ({
      ...docs,
      [`Document ${Object.keys(docs).length + 1}`]: body,
    }));
  }
  
  function handleSelectMode(name: string) {
    if (name === 'index' || name === 'query') {
      selectMode(name);
    }
  }
  
  return (
    <Box flexDirection="column">
      <Text>Use tab to move around.</Text>
      <Index onAddDoc={handleAddDoc} docsIndexed={Object.keys(docs).length} />
      <Query query={queryString} onQueryChange={setQueryString} />
      <Search query={queryString} docs={docs} />
    </Box>
  );
};

const Index: React.FC<{
  onAddDoc: (doc: string) => void;
  docsIndexed: number;
}> = function ({ onAddDoc, docsIndexed }) {
  const { isFocused } = useFocus({ autoFocus: true });
  return (
    <Box gap={2}>
      <Text inverse={isFocused}>Index a document</Text>
      {isFocused
        ? <TextInput
            key={docsIndexed}
            placeholder="Enter or paste a Japanese string and press enter…"
            isDisabled={!isFocused}
            onSubmit={val => { onAddDoc(val) }}
          />
        : <Text> </Text>}
    </Box>
  );
};

const Query: React.FC<{
  query: string;
  onQueryChange: (query: string) => void;
}> = function ({ query, onQueryChange }) {
  const { isFocused } = useFocus();
  return (
    <Box gap={2}>
      <Text inverse={isFocused}>Search documents</Text>
      <TextInput
        isDisabled={!isFocused}
        placeholder="Enter search query…"
        value={query}
        onChange={onQueryChange}
      />
    </Box>
  );
}

const Search: React.FC<{
  query: string;
  docs: Record<string, string>;
}> = function ({ query, docs }) {
  const lunrIndex = useMemo((() => lunr(function () {
    this.ref('name');
    this.field('body');
    for (const [name, body] of Object.entries(docs)) {
      this.use((lunr as any).ja);
      this.add({ name, body });
    }
    //console.debug(`Indexed ${docs.length} docs`);
  })), [docs]);

  const [results, error] = useMemo(() => {
    try {
      return [lunrIndex.search(query) ?? [], null];
    } catch (e) {
      return [[], `${e.message}`];
    }
  }, [lunrIndex, query]);

  return (
    <Box flexDirection="column">
      {error
        ? <Text>Error searching: {error}</Text>
        : query.trim() !== ''
          ? <Text>{results.length} documents matched:</Text>
          // Empty query means all docs are shown
          : <Text>{Object.keys(docs).length} documents indexed:</Text>}
      <Box flexDirection="column">
        {results.map((res) => <Result key={res.ref} name={res.ref} body={docs[res.ref]} />)}
      </Box>
    </Box>
  );
}

const Result: React.FC<{ name: string, body: string }> = function ({ name, body }) {
  const { isFocused } = useFocus();
  return (
    <Box gap={2}>
      <Text inverse={isFocused}>{name}</Text>
      {isFocused ? <Text>{body}</Text> : null}
    </Box>
  );
}

render(<Home />);
