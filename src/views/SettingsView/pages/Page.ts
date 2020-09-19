import { Direction, QBoxLayout, QWidget } from '@nodegui/nodegui';

export abstract class Page extends QWidget {
  abstract title: string;

  layout = new QBoxLayout(Direction.TopToBottom);

  constructor() {
    super();
    this.setObjectName('Page');
    this.setLayout(this.layout);
    this.layout.setContentsMargins(40, 60, 40, 80);
    this.layout.setSpacing(0);
  }
}
