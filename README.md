# Mink - Meteor integration for INK File Picker

[INK Filepicker](https://www.inkfilepicker.com/) (previously filepicker.io) makes it
incredibly easy to deal with cloud storage, but for the webapp and for the user, and
saving the developer a lot of time.  Yet I still felt there was some unnecessary
development time being wasted to integrate filepicker into new projects.  Within the
Meteor framework, I felt these issues could be abstracted away for most developers,
so they don't waste any time to include file management in their app.

## Features:

# Add file attachment support with 2 lines of code (see Quick Start)
# Visually appealing display of file names, size, icon for type, etc.
# Images will be grouped into a thumbnail gallery and shown with Fancybox
# Thumbnails for the above and in general can be automatically generated
# Handles user-cropping of images (e.g. profile pictures) with JCrop
# Set default URL style (via filepicker, direct from s3, or on your domain)

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

### Profiles

### URL choice

### Request-time validation for domain URLs

TODO

* remove files
* remove files before upload
* can we keep image previews before downlodaing from server?
* svg icons with png fallback for file extension/type
* better 'loading' and 'scaling' graphic placeholders
* allow saving of converted medium and large sizes (vs super big original size)
* should certain activities be done via the server?
* security policies, user or admin (func) only