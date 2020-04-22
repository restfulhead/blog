Activate Ruby Env
`eval "$(rbenv init -)"`

First time install
* gem install jekyll
* gem install all plugins from _config.yaml
* image plugin requires ImageMagick 6 (not 7)
** either `brew install imagemagick@6`, `brew install pkg-config` and then `gem install rmagick` (you need to add ImageMagick to the path for this)

Workflow Current
* Create a draft (name file without date) in `_drafts` dir
* Preview with jekyll serve --drafts
* To publish, manually copy over to _posts dir. Add date to file name and to header.
** Watch out: Date format in the header is different (day before month) than in the file
** Watch out again: If you set the date to the future, your post won't show. This can bite you when daylight savings change the hour offset

To build and deploy
* `./build.sh` will generate the site into `../ruhkopf-blog-deploy` 
* `ruhkopf-blog-deploy` points to the `gh_pages` branch
* simply push

Worflow future
* Check out https://github.com/jekyll/jekyll-compose



Offtopic, serverless pipeline:

```
graph TD

Setup-->BB[Backend Build/Test]
BB-->BA[Backend Audit/Dep check]
BA-->BD[Backend Deploy]
BD-->BP[Backend Post depl]
BP-->BE[Backend API E2E tests]
BE-->FB[Frontend Build/Test]
FB-->FA[Frontend Audit/Dep check]
FA-->FD[Frontend Deployment]
FD-->FT[Frontend UI E2E Tests]
FT-->AT[Auto Tag]
AT-->QC[QC Analysis]
```