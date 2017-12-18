import matter from 'gray-matter';
import tomlFormatter from './toml';
import yamlFormatter from './yaml';
import jsonFormatter from './json';

const parsers = {
  toml: {
    parse: input => tomlFormatter.fromFile(input),
    stringify: (metadata, { sortedKeys }) => tomlFormatter.toFile(metadata, sortedKeys),
  },
  json: {
    parse: input => {
      let JSONinput = input.trim();
      // Fix JSON if leading and trailing brackets were trimmed.
      if (JSONinput.substr(0, 1) !== '{') {
        JSONinput = '{' + JSONinput;
      }
      if (JSONinput.substr(-1) !== '}') {
        JSONinput = JSONinput + '}';
      }
      return jsonFormatter.fromFile(JSONinput);
    },
    stringify: (metadata, { sortedKeys }) => {
      let JSONoutput = jsonFormatter.toFile(metadata, sortedKeys).trim();
      // Trim leading and trailing brackets.
      if (JSONoutput.substr(0, 1) === '{' && JSONoutput.substr(-1) === '}') {
        JSONoutput = JSONoutput.substr(1, JSONoutput.length - 1);
      }
      return JSONoutput;
    },
  },
  yaml: {
    parse: input => yamlFormatter.fromFile(input),
    stringify: (metadata, { sortedKeys }) => yamlFormatter.toFile(metadata, sortedKeys),
  },
}

function inferFrontmatterFormat(str) {
  const firstLine = str.substr(0, str.indexOf('\n')).trim();
  if ((firstLine.length > 3) && (firstLine.substr(0, 3) === "---")) {
    // No need to infer, `gray-matter` will handle things like `---toml` for us.
    return;
  }
  switch (firstLine) {
    case "---":
      return getFormatOpts('yaml');
    case "+++":
      return getFormatOpts('toml');
    case "{":
      return getFormatOpts('json');
    default:
      throw "Unrecognized front-matter format.";
  }
}

export const getFormatOpts = format => ({
  yaml: { language: "yaml", delimiters: "---" },
  toml: { language: "toml", delimiters: "+++" },
  json: { language: "json", delimiters: ["{", "}"] },
}[format]);

export default {
  fromFile(content) {
    const result = matter(content, { engines: parsers, ...inferFrontmatterFormat(content) });
    return {
      ...result.data,
      body: result.content,
    };
  },

  toFile(data, sortedKeys) {
    const { body = '', ...meta } = data;

    // always stringify to YAML
    // `sortedKeys` is not recognized by gray-matter, so it gets passed through to the parser
    return matter.stringify(body, meta, { engines: parsers, sortedKeys, ...getFormatOpts('yaml') });
  }
}
