import lunr from 'lunr';
import { type Index as LunrIndex } from 'lunr';

import enableLunrStemmer from 'lunr-languages/lunr.stemmer.support';
import enableTinyLunrSegmenter from 'lunr-languages/tinyseg';
import enableLunrFr from 'lunr-languages/lunr.fr';
import enableLunrJa from 'lunr-languages/lunr.ja';

enableTinyLunrSegmenter(lunr);
enableLunrStemmer(lunr);
enableLunrJa(lunr);


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
      <Box>
        <Text>Use tab to move around.</Text>
      </Box>
      <Box gap={2}>
        <Index onAddDoc={handleAddDoc} docsIndexed={Object.keys(docs).length} />
      </Box>
      <Box gap={2}>
        <Search query={queryString} onQueryChange={setQueryString} />
      </Box>
      <Box flexDirection="column">
        <Results query={queryString} docs={docs} />
      </Box>
    </Box>
  );
};

const Index: React.FC<{
  onAddDoc: (doc: string) => void;
  docsIndexed: number;
}> = function ({ onAddDoc, docsIndexed }) {
  const { isFocused } = useFocus({ autoFocus: true });
  return (
    <React.Fragment>
      <Text inverse={isFocused}>Index a document</Text>
      {isFocused
        ? <TextInput
            key={docsIndexed}
            placeholder="Enter or paste a Japanese string and press enter…"
            isDisabled={!isFocused}
            onSubmit={val => { onAddDoc(val) }}
          />
        : <Text> </Text>}
    </React.Fragment>
  );
};

const Search: React.FC<{
  query: string;
  onQueryChange: (query: string) => void;
}> = function ({ query, onQueryChange }) {
  const { isFocused } = useFocus();
  return (
    <React.Fragment>
      <Text inverse={isFocused}>Search documents</Text>
      <TextInput
        isDisabled={!isFocused}
        placeholder="Enter search query…"
        value={query}
        onChange={onQueryChange}
      />
    </React.Fragment>
  );
}

const Results: React.FC<{
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
    <React.Fragment>
      {error
        ? <Text>Error searching: {error}</Text>
        : <Text>{results.length} documents matched:</Text>}
      <Box flexDirection="column">
        {results.map((res) => <Result key={res.ref} name={res.ref} body={docs[res.ref]} />)}
      </Box>
    </React.Fragment>
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
