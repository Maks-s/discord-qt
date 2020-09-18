import { Dialog } from './Dialog';
import { QLabel, QLineEdit, QComboBox, QBoxLayout, Direction, QWidget, CursorShape, QPixmap, WidgetEventTypes, QPoint } from '@nodegui/nodegui';
import { app } from '..';
import { DColorButton, DColorButtonColor } from '../components/DColorButton/DColorButton';
import { resolveEmoji } from '../utilities/ResolveEmoji';
import { Emoji } from 'discord.js';
import { EmojiPicker } from '../components/EmojiPicker/EmojiPicker';
import { DComboBox } from '../components/DComboBox/DComboBox';
import { DTextEdit } from '../components/DTextEdit/DTextEdit';
import { __ } from 'i18n';

export class CustomStatusDialog extends Dialog {
  private statusLabel = new QLabel(this);
  private emojiInput = new QLabel(this);
  private statusInput = new DTextEdit(this);
  private clearLabel = new QLabel(this);
  private clearInput = new DComboBox(this);
  private emoji?: Emoji;

  constructor(parent?: any) {
    super(parent);
    this.header.setText(__('CUSTOM_STATUS_SET_CUSTOM_STATUS'));
    this.init();
    this.initFooter();
  }

  show() {
    if (!app.client?.user) return;
    super.show();
    this.statusLabel.setText(__('CUSTOM_STATUS_MODAL_BODY', { username: app.client?.user?.username || '' }));
    this.statusInput.setText(app.client.user.customStatus?.text || '');
    const eid = app.client.user.customStatus?.emoji_id;
    if (!eid) return;
    const emoji = app.client.emojis.resolve(eid);
    if (!emoji) return;
    this.loadEmoji(emoji);
  }

  private async loadEmoji(emoji: Emoji) {
    const emojiFile = await resolveEmoji({ emoji_id: emoji.id || undefined, emoji_name: emoji.name });
    if (!emojiFile) return;
    this.emoji = emoji;
    this.emojiInput.setPixmap(new QPixmap(emojiFile).scaled(32, 32, 1, 1));
  }

  private init() {
    const { statusLabel, emojiInput, statusInput, clearLabel, clearInput } = this;
    const layout = new QBoxLayout(Direction.TopToBottom);
    layout.setSpacing(8);
    layout.setContentsMargins(16, 0, 16, 16);
    const statusLayout = new QBoxLayout(Direction.LeftToRight);
    const emojiPicker = new EmojiPicker(emojiInput);
    emojiInput.setObjectName('DTextEdit');
    emojiInput.setFixedSize(48, 48);
    emojiInput.setCursor(CursorShape.PointingHandCursor);
    emojiInput.addEventListener(WidgetEventTypes.MouseButtonPress, () => {
      const map = emojiInput.mapToGlobal(this.p0);
      const point = new QPoint(map.x(), map.y() + emojiInput.size().height());
      emojiPicker.popup(point);
      emojiPicker.events.once('emoji', async (emoji: Emoji) => {
        await this.loadEmoji(emoji);
        emojiPicker.hide();
      })
    });
    statusInput.setPlaceholderText(__('CUSTOM_STATUS_MODAL_PLACEHOLDER'));
    const resetButton = new DColorButton(DColorButtonColor.RED_TEXT);
    resetButton.setText('×');
    resetButton.setFixedSize(38, 38);
    resetButton.setInlineStyle('font-size: 32px; padding: 0');
    resetButton.addEventListener('clicked', () => app.client.user?.setCustomStatus({ text: undefined }));
    statusLayout.setSpacing(5);
    statusLayout.setContentsMargins(0, 0, 0, 0);
    statusLayout.addWidget(emojiInput);
    statusLayout.addWidget(statusInput);
    statusLayout.addWidget(resetButton);
    statusLabel.setObjectName('Header3');
    statusLabel.setBuddy(statusInput);
    clearLabel.setObjectName('Header3');
    clearInput.addItems([
      __('CUSTOM_STATUS_DONT_CLEAR'),
      __('CUSTOM_STATUS_TODAY'),
      __('CUSTOM_STATUS_HOURS', { hours: '4' }),
      __('CUSTOM_STATUS_HOURS', { hours: '1' }),
      __('CUSTOM_STATUS_MINUTES', { minutes: '30'})
    ]);
    clearLabel.setText(__('CUSTOM_STATUS_CLEAR_AFTER'));
    clearLabel.setBuddy(clearInput);
    layout.addWidget(statusLabel);
    layout.addLayout(statusLayout);
    layout.addSpacing(8);
    [clearLabel, clearInput].forEach(w => layout.addWidget(w));
    this.controls.addLayout(layout);
  }

  private initFooter() {
    const footer = new QWidget(this);
    footer.setObjectName('Footer');
    const footLayout = new QBoxLayout(Direction.LeftToRight);
    footLayout.addStretch(1);
    footLayout.setContentsMargins(16, 16, 16, 16);
    const saveBtn = new DColorButton(DColorButtonColor.BLURPLE);
    saveBtn.setText('Save');
    saveBtn.setFixedSize(96, 38);
    saveBtn.addEventListener('clicked', () => {
      let date: Date | null = new Date();
      switch (this.clearInput.currentIndex()) {
        case 0:
          date.setDate(date.getDate() + 1);
          date.setHours(0, 0, 0, 0);
          break;
        case 1:
          date.setHours(date.getHours() + 4);
          break;
        case 2:
          date.setHours(date.getHours() + 1);
          break;
        case 3:
          date.setMinutes(date.getMinutes() + 30);
          break;
        default:
          date = null;
          break;
      }
      app.client.user?.setCustomStatus({
        emoji_id: this.emoji?.id || undefined,
        emoji_name: this.emoji?.name,
        expires_at: date?.toISOString(),
        text: this.statusInput.text() || undefined
      });
      this.hide();
    })
    const cancelBtn = new DColorButton(DColorButtonColor.WHITE_TEXT);
    cancelBtn.setText(__('CANCEL'));
    cancelBtn.setFixedSize(80, 38);
    cancelBtn.addEventListener('clicked', () => this.hide());
    footLayout.addWidget(cancelBtn);
    footLayout.addWidget(saveBtn);
    footer.setLayout(footLayout);
    this.controls.addWidget(footer);
  }
}