
var Marked = require("marked")
  , Crypto = require('crypto')
  , Nsh    = require('node-syntaxhighlighter')
  , Fs             = require('fs')
  , Namer  = require("../lib/namer");
  
var fragCache = {};
var Git = app.locals.Git;

Marked.setOptions({
  gfm: true,
  pedantic: false,
  breaks: true,
  smartLists: true,
  sanitize: false, // To be able to add iframes 
  highlight: function(code, lang) {
    lang = lang || "text";
    if (lang == 'puml') return '<img uml="'+encodeURIComponent('\n'+code+'\n')+'">';
    return Nsh.highlight(code, Nsh.getLanguage(lang) || Nsh.getLanguage('text'), {gutter: lang !== 'text'});
  }
});

var tagmap = {};

// Yields the content with the rendered [[bracket tags]]
// The rules are the same for Gollum https://github.com/github/gollum
function extractTags(text) {

  tagmap = {};
  
  var matches = text.match(/(.?)\[\[(.+?)\]\]([^\[]?)/g)
    , tag
    , id;

  if (matches) {
    matches.forEach(function(match) {
      match = match.trim();
      tag = /(.?)\[\[(.+?)\]\](.?)/.exec(match);
      if (tag[1] == "'") {
        return;
      }
      id = Crypto.createHash('sha1').update(tag[2]).digest("hex")
      tagmap[id] = tag[2];
      text = text.replace(tag[0], id);
    });

  }
  return text;
}

function evalTags(text) {

  var parts
    , name
    , pageName
    , re;

  for (var k in tagmap) {
    parts = tagmap[k].split("|");
    name = pageName = parts[0].trim();
    //mathack
    if (parts[1]) {
      pageName = parts[1];
    }
    pageName = Namer.normalize(pageName);
    if (tagmap[k].charAt(0) == '+') tagmap[k] = transclude(name.substring(1), pageName);
    else tagmap[k] = "<a class=\"internal\" href=\"/wiki/" + pageName + "\">" + name + "</a>";
  }


  for (k in tagmap) {
    re = new RegExp(k, "g");
    text = text.replace(re, tagmap[k]);
  }

  return text;

  //return text.replace(/\n/g, "");
}

function transclude(name, pageName) { 
   /*
   Git.readFile(pageName + ".md", "HEAD", function(err, content) {
      if (err) content = "PAGE NOT FOUND";
      else content = '<a href="/pages/'+pageName+'/edit">Edit</a>\n' + Renderer.render(content);
   }); 
   */
   var path = Git.absPath(pageName + '.md');
   if (Fs.existsSync(path)) {
      var content  = Fs.readFileSync(path).toString();
      tagmap1 = tagmap;
      content = Marked(evalTags(extractTags(content)));
      tagmap = tagmap1;
    //var text = Marked(content);
      //content = Marked(content);
      content = '<a href="/pages/'+pageName+'/edit">Edit</a>' + content;
   } else content = "PAGE NOT FOUND";
   return name +'\n<div class="include">'+content+'</div>';
}

var Renderer = {

  render: function(content) {
    var text = extractTags(content);
    text = evalTags(text);
    return Marked(text);
    //var text = Marked(content);
    //return evalTags(extractTags(text));
    
  }

};

module.exports = Renderer;
