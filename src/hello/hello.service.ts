import { Injectable } from '@nestjs/common';
import { I18nContext, I18nService } from 'nestjs-i18n';

@Injectable()
export class HelloService {
  constructor(private readonly i18n: I18nService) {}

  async getHello(): Promise<string> {
    const lang = I18nContext.current()?.lang || 'en';
    return this.i18n.t('common.hello', { lang });
  }
}
