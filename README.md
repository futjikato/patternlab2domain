Patternlab2Cr
============

Create a content repository structure from a patternlab project.

Usage
-----

```
node main.js --tplBaseDir="path/to/source/_patterns/04-pages" --patternDir="path/to/source/_patterns"
```

### Custom parsing mechanisms

#### Name includes

In the context of a domain model you often need to name includes.
This is even mandatory if you include something multiple times in the same template.
In the example below we name the import of the organism-header as 'header'.

```
<div class="page" id="page">
  {{! cr:import header }}
	{{> organisms-header }}
	<div role="main">
```

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