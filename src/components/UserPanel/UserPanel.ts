import { QWidget, QLabel, QSize, QPixmap, QBoxLayout, Direction, QPushButton } from "@nodegui/nodegui";
import { Client, Constants, Presence, Activity, CustomStatus } from "discord.js";
import path from 'path';
import TWEmoji from 'twemoji';
import { app, MAX_QSIZE } from "../..";
import { pictureWorker } from "../../utilities/PictureWorker";
import { DIconButton } from "../DIconButton/DIconButton";
import { Events } from "../../structures/Events";
import { PresenceStatusColor } from '../../structures/PresenceStatusColor';
import './UserPanel.scss';

export class UserPanel extends QWidget {
  private avatar = new QLabel(this);
  private nameLabel = new QLabel(this);
  private discLabel = new QLabel(this);
  private statusIcon = new QLabel(this);
  private statusText = new QLabel(this);
  private statusBtn = new QPushButton(this);
  private controls = new QBoxLayout(Direction.LeftToRight);

  constructor() {
    super();

    this.initComponent();
    app.on(Events.NEW_CLIENT, this.bindEvents.bind(this));
    app.on(Events.READY, () => {
      if (!app.config.enableAvatars) this.avatar.hide();
    });
  }

  bindEvents(client: Client) {
    const { Events: DiscordEvents } = Constants;
    this.nameLabel.setText('Connecting...');
    this.discLabel.setText('#0000');
    client.on(DiscordEvents.CLIENT_READY, () => {
      this.updateData();
      this.updateAvatar();
      this.updatePresence();
    });
    client.on(DiscordEvents.USER_UPDATE, (prev, cur) => {
      this.updateData();
      if (prev.avatar !== cur.avatar) this.updateAvatar();
    });
    client.on(DiscordEvents.PRESENCE_UPDATE, (_o, presence) => {
      if (presence.userID === client.user?.id)
        this.updatePresence();
    });
    client.on(DiscordEvents.USER_SETTINGS_UPDATE, () => {
      this.updatePresence();
    });
  }

  private initComponent() {
    const { avatar, nameLabel, discLabel, controls, statusBtn, statusIcon, statusText } = this;
    this.setLayout(controls);
    this.setObjectName('UserPanel');
    this.setMinimumSize(0, 52);
    this.setMaximumSize(MAX_QSIZE, 52);

    controls.setContentsMargins(8, 8, 8, 8)
    controls.setSpacing(8);

    avatar.setObjectName('UserAvatar');
    avatar.setFixedSize(32, 32);

    const layInfo = new QBoxLayout(Direction.TopToBottom);
    layInfo.setSpacing(0);
    layInfo.setContentsMargins(0, 0, 0, 0);
    nameLabel.setText('No account');
    nameLabel.setObjectName('NameLabel');

    const layStat = new QBoxLayout(Direction.LeftToRight);
    layStat.setSpacing(4);
    layStat.setContentsMargins(0, 0, 0, 0);

    discLabel.setText('#0000');
    discLabel.setObjectName('DiscLabel');

    layStat.addWidget(discLabel, 1);
    layStat.addWidget(statusIcon);
    layStat.addWidget(statusText, 1);

    statusIcon.hide();
    statusText.hide();

    layInfo.addWidget(nameLabel);
    layInfo.addLayout(layStat);

    statusBtn.setText('●');
    statusBtn.setObjectName('DIconButton');
    statusBtn.setProperty('tooltip', 'Offline');
    statusBtn.setFixedSize(32, 32);
    // statusBtn.addEventListener('clicked', () => app.emit(Events.SWITCH_VIEW, 'settings'));
    /*
    const iBtn = new DIconButton({
      iconPath: path.join(__dirname, './assets/icons/invite.png'),
      iconQSize: new QSize(20, 20),
      tooltipText: 'Accept Invite Code'
    });
    iBtn.setFixedSize(32, 32);
    iBtn.addEventListener('clicked', () => app.emit(Events.SWITCH_VIEW, 'invite'));
    */
    const setBtn = new DIconButton({
      iconPath: path.join(__dirname, './assets/icons/cog.png'),
      iconQSize: new QSize(20, 20),
      tooltipText: 'User Settings'
    });
    setBtn.setFixedSize(32, 32);
    setBtn.addEventListener('clicked', () => app.emit(Events.SWITCH_VIEW, 'settings'));
    controls.addWidget(avatar, 0);
    controls.addLayout(layInfo, 1);
    controls.addWidget(statusBtn, 0);
    controls.addWidget(setBtn, 0);
  }

  async updateData(): Promise<void> {
    const { nameLabel, discLabel, statusBtn } = this;
    const { client } = app;
    if (!client.user) {
      nameLabel.setText('No account');
      discLabel.setText('#0000');
      statusBtn.setInlineStyle('');
      return;
    }
    nameLabel.setText(client.user.username);
    discLabel.setText(`#${client.user.discriminator}`);
  }

  async updateAvatar(): Promise<void> {
    const { client } = app;
    if (!client.user) return;
    let avatarBuf = await pictureWorker.loadImage(
      client.user.avatarURL({ format: 'png', size: 64 }) || client.user.defaultAvatarURL
    );

    if (avatarBuf !== null) {
      const avatarPixmap = new QPixmap();
      avatarPixmap.loadFromData(avatarBuf, 'PNG');
      this.avatar.setPixmap(avatarPixmap.scaled(32, 32, 1, 1));
    }
  }

  async loadStatusEmoji(status: CustomStatus) {
    this.statusIcon.hide();
    if (!status.emoji_id) {
      if (!status.emoji_name) return;
      TWEmoji.parse(status.emoji_name, {
        // @ts-ignore
        callback: async (icon, { base, size, ext }) => {
          const url = `${base}${size}/${icon}${ext}`;
          console.log(url);
          return this.dlStatusEmoji(url);
        }
      })
      return;
    }
    // @ts-ignore
    const emojiUrl = app.client.rest.cdn.Emoji(status.emoji_id, 'png');
    return this.dlStatusEmoji(emojiUrl);
  }

  private async dlStatusEmoji(emojiUrl?: string) {
    if (!emojiUrl) return;
    const buf = await pictureWorker.loadImage(emojiUrl, { roundify: false, size: 16 })
    if (!buf) return;
    const pix = new QPixmap();
    pix.loadFromData(buf, 'PNG');
    this.statusIcon.setPixmap(pix.scaled(14, 14, 1, 1));
    this.statusIcon.show();
  }

  async updatePresence() {
    const { avatar, nameLabel, discLabel, controls, statusBtn, statusIcon, statusText } = this;
    const user = app.client.user;
    if (!user) return;
    const { customStatus, presence } = user;

    if (!customStatus) {
      statusIcon.hide();
      statusText.hide();
      discLabel.show();
      return;
    }

    statusBtn.setInlineStyle(`color: ${PresenceStatusColor.get(presence.status)};`);
    statusBtn.setProperty('toolTip', presence.status);
    this.loadStatusEmoji(customStatus);
    this.statusText.setText(customStatus.text || '');

    statusText.show();
    discLabel.hide();
  }
}