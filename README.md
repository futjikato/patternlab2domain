patternlab2domain
============

Create a JSON domain model from a patternlab project.

Usage
-----

```
node main.js --tplBaseDir="path/to/source/_patterns/04-pages" --patternDir="path/to/source/_patterns"
```

### Custom parsing mechanisms

#### Adding meta information

In the context of a domain model you often need to add meta information.
This is even mandatory if you include something multiple times in the same template.
The example below shows a named include and some added meta data for a variable.

```
  {{! cr:element {"name":"header"} }}
	{{> organisms-header }}
  {{! cr:element {"neos":{"inlineEditable":true} } }}
  {{ newvar }}
```

All the meta data must be provided as a JSON string inside a mustache comment with the format:

```
{{! cr:element <JSON> }}
```

Note that you must separate double object braces in the JSON content by a space so the mustache template is still valid.

#### Additional node information

You may define some atoms or molecules that should not be domain model nodes but simply be part of the parent element.
Such information can be provided in every template by adding an cr:node comment. These comments contain a JSON string.

```
{{! cr:node {"isOwnElement":"false"} }}
<hr />
```

This example will indicate that the node should not be handled as an element and will simply be
included in the parent node template.

Develop
-------

To create the API documentation with jsdoc run the following command.
Don't forget that you need dev-dependencies.

```
npm run create-doc
```