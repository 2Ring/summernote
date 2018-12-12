import $ from 'jquery';
import env from '../core/env';
import key from '../core/key';

export default class ImageDialog {
  constructor(context) {
    this.context = context;
    this.ui = $.summernote.ui;
    this.$body = $(document.body);
    this.$editor = context.layoutInfo.editor;
    this.options = context.options;
    this.lang = this.options.langInfo;
  }

  initialize() {
    let $container = this.options.dialogsInBody ? this.$body : this.$editor;
    if (this.options.dialogsWrapper) {
      $container = this.options.dialogsWrapper;
    }

    let imageLimitation = '';
    if (this.options.maximumImageFileSize) {
      const unit = Math.floor(Math.log(this.options.maximumImageFileSize) / Math.log(1024));
      const readableSize = (this.options.maximumImageFileSize / Math.pow(1024, unit)).toFixed(2) * 1 +
                         ' ' + ' KMGTP'[unit] + 'B';
      imageLimitation = `<small>${this.lang.image.maximumFileSize + ' : ' + readableSize}</small>`;
    }

    var body = [
      '<div class="note-form-group note-group-select-from-files">',
      '<input id="_insert-file-input" style="display: none" class="note-image-input note-form-control note-input" ',
      ' type="file" name="files" accept="image/*" multiple="multiple" />',
      '</div>',
      '<label class="note-form-label">' + this.lang.image.url + '</label>',
      `<div class="form-group note-group-image-url ${this.options.allowImageFromDisk === false ? '' : 'input-group'}" style="overflow:auto;">`,
      '<input class="note-image-url form-control note-form-control note-input ',
      ' col-md-12" type="text" />',
      `<label for="_insert-file-input" class="note-form-label btn btn-primary input-group-addon" ${this.options.allowImageFromDisk === false ? ' style="display: none"' : ''}>${this.lang.image.selectFromFiles}</label>`,
      imageLimitation,
      '</div>'
    ].join('');
    const buttonClass = 'btn btn-primary note-btn note-btn-primary note-image-btn';
    const footer = `<button type="submit" href="#" class="${buttonClass}" disabled>${this.lang.image.insert}</button>`;

    this.$dialog = this.ui.dialog({
      title: this.lang.image.insert,
      fade: this.options.dialogsFade,
      body: body,
      footer: footer
    }).render().appendTo($container);

    if (!this.options.dialogsInBody) {
      this.$dialog.css('position', 'absolute');
    }
  }

  destroy() {
    this.ui.hideDialog(this.$dialog);
    this.$dialog.remove();
  }

  bindEnterKey($input, $btn) {
    $input.on('keypress', (event) => {
      if (event.keyCode === key.code.ENTER) {
        event.preventDefault();
        $btn.trigger('click');
      }
    });
  }

  show() {
    this.context.invoke('editor.saveRange');
    this.showImageDialog().then((data) => {
      // [workaround] hide dialog before restore range for IE range focus
      this.ui.hideDialog(this.$dialog);
      this.context.invoke('editor.restoreRange');

      if (typeof data === 'string') { // image url
        this.context.invoke('editor.insertImage', data);
      } else { // array of files
        this.context.invoke('editor.insertImagesOrCallback', data);
      }
    }).fail(() => {
      this.context.invoke('editor.restoreRange');
    });
  }

  /**
   * show image dialog
   *
   * @param {jQuery} $dialog
   * @return {Promise}
   */
  showImageDialog() {
    return $.Deferred((deferred) => {
      const $imageInput = this.$dialog.find('.note-image-input');
      const $imageUrl = this.$dialog.find('.note-image-url');
      const $imageBtn = this.$dialog.find('.note-image-btn');

      this.ui.onDialogShown(this.$dialog, () => {
        this.context.triggerEvent('dialog.shown');

        // Cloning imageInput to clear element.
        $imageInput.replaceWith($imageInput.clone().on('change', (event) => {
          deferred.resolve(event.target.files || event.target.value);
        }).val(''));

        $imageBtn.click((event) => {
          event.preventDefault();

          deferred.resolve($imageUrl.val());
        });

        $imageUrl.on('keyup paste', () => {
          const url = $imageUrl.val();
          this.ui.toggleBtn($imageBtn, url);
        }).val('');

        if (!env.isSupportTouch) {
          $imageUrl.trigger('focus');
        }
        this.bindEnterKey($imageUrl, $imageBtn);
      });

      this.ui.onDialogHidden(this.$dialog, () => {
        $imageInput.off('change');
        $imageUrl.off('keyup paste keypress');
        $imageBtn.off('click');

        if (deferred.state() === 'pending') {
          deferred.reject();
        }
      });

      this.ui.showDialog(this.$dialog);
    });
  }
}
