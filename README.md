# Mink - Meteor integration for INK File Picker

[INK Filepicker](https://www.inkfilepicker.com/) (previously filepicker.io) makes it
incredibly easy to deal with cloud storage, but for the webapp and for the user, and
saving the developer a lot of time.  Yet I still felt there was some unnecessary
development time being wasted to integrate filepicker into new projects.  Within the
Meteor framework, I felt these issues could be abstracted away for most developers,
so they don't waste any time to include file management in their app.  Screenshot:

![Screenshot](https://f.cloud.github.com/assets/381978/1532042/e9f7ada6-4c70-11e3-8173-018289241776.jpg "Screenshot")

Note: unfortunately, it seems that ink aren't offering their free plans anymore :(
So if you don't have an ink account, you'll need to sign up for one of their
[https://www.inkfilepicker.com/pricing/](free 10 day trials) after which their
cheapest plan is $19/mo.


## Features:

* Add file attachment support with 2 lines of code (see Quick Start)
* Visually appealing display of file names, size, icon for type, etc.
* Images will be grouped into a thumbnail gallery and shown with Fancybox
* Thumbnails for the above and in general can be automatically generated
* Handles user-cropping of images (e.g. profile pictures) with JCrop
* Set default URL style (via filepicker, direct from s3, or on your domain)

## Design Principles

1. Minimal markup to integrate, yet still offer powerful flexibility
1. Full inkblobs and additional data stored in database collection
1. All display logic updates via reactivity and not via Javascript
1. Auto integrate with user-installed packages like fancybox, iron-router

## Quick Start

Requires a previously configured INK account, AWS S3 bucket, etc (see
[INK home page](https://www.inkfilepicker.com/) for details).  No need
to include their JS library, we'll handle that for you.

Create a `lib/mink.js` or modify your `lib/setup.js`, etc, with your
filepicker api key, e.g.:

```js
mink.init('FilePickerApiKey');
```

In your template, add:

```html
{{minkFiles}}
```

In your javascript, when saving a document, include:

```js
{
	attachments: mink.minData()
}
```

That's it!

## Stuff


no more free plan! :(

token can be 'new', 'user', or db id etc.

## Customization, security, etc.

### Display customizations

* Create your own CSS to override the definitions in `mink.css`
* Create your own templates based on `mink.html`

### Profiles

Create profiles your group together common options for e.g. message attachments,
profile pictures, etc.  If you don't specify a profile, mink defaults to the options
in the preset default profile (which you can modify on init), e.g.

```js
    mink.init("ink-API-key", {
        'profiles': {
            default: {
                minkOptions: {
                    urlType: 'domain',
                    thumbHeight: 50
                }
            },
            myFiles: {
            	picker_options: {
            		multiple: false
            	},
            	storage_options: {
	            	path: '/myFiles/'
	            }
            }
        }
    });
```

### URL choice

### Request-time validation for domain URLs

### Full Mink JS API

## TODO

* remove files
* remove files before upload
* can we keep image previews before downlodaing from server?
* svg icons with png fallback for file extension/type
* better 'loading' and 'scaling' graphic placeholders
* allow saving of converted medium and large sizes (vs super big original size)
* should certain activities be done via the server?
* security policies, user or admin (func) only
