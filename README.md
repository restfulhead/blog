Activate Ruby Env
`eval "$(rbenv init -)"`

First time install
* gem install jekyll
* gem install all plugins from _config.yaml
* image plugin requires ImageMagick 6 (not 7)
** either `brew install imagemagick@6` and then `gem install rmagick` (you need to add ImageMagick to the path for this)
** or MacPorts

Workflow Current
* Create a draft (name file without date) in `_drafts` dir
* Preview with jekyll serve --drafts
* To publish, manually copy over to _posts dir. Add date to file name and to header.
** Watch out: Date format in the header is different (day before month) than in the file
** Watch out again: If you set the date to the future, your post won't show. This can bite you when daylight savings change the hour offset

To build and deploy
* `./build.sh` will generate the site into `../ruhkopf-blog-build` 
* `ruhkopf-blog-build` points to the `gh_pages` branch
* simply push

Worflow future
* Check out https://github.com/jekyll/jekyll-compose