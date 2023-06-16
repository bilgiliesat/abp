import { Confirmation, CustomHttpErrorHandlerService } from '../models';
import {
  CUSTOM_HTTP_ERROR_HANDLER_PRIORITY,
  DEFAULT_ERROR_LOCALIZATIONS,
  DEFAULT_ERROR_MESSAGES,
} from '../constants/default-errors';
import { AuthService, LocalizationParam } from '@abp/ng.core';
import { Observable } from 'rxjs';
import { inject, Injectable } from '@angular/core';
import { ConfirmationService } from './confirmation.service';
import { CreateErrorComponentService } from './create-error-component.service';

@Injectable({ providedIn: 'root' })
export class StatusCodeErrorHandlerService implements CustomHttpErrorHandlerService {
  private readonly confirmationService = inject(ConfirmationService);
  private readonly createErrorComponentService = inject(CreateErrorComponentService);
  private readonly authService = inject(AuthService);
  readonly priority = CUSTOM_HTTP_ERROR_HANDLER_PRIORITY.normal;
  private status: typeof this.handledStatusCodes[number];
  private readonly handledStatusCodes = [401, 403, 404, 500] as const;

  canHandle({ status }): boolean {
    this.status = status;
    return this.handledStatusCodes.indexOf(status) > -1;
  }

  execute() {
    const key = `defaultError${this.status}`;
    const title = {
      key: DEFAULT_ERROR_LOCALIZATIONS[key]?.title,
      defaultValue: DEFAULT_ERROR_MESSAGES[key]?.title,
    };
    const message = {
      key: DEFAULT_ERROR_LOCALIZATIONS[key]?.details,
      defaultValue: DEFAULT_ERROR_MESSAGES[key]?.details,
    };

    const canCreateCustomError = this.createErrorComponentService.canCreateCustomError(this.status);
    switch (this.status) {
      case 401:
      case 404:
        if (canCreateCustomError) {
          this.showPage();
          break;
        }
        this.showConfirmation(title, message).subscribe(() => {
          if (this.status === 401) {
            this.navigateToLogin();
          }
        });
        break;

      case 403:
      case 500:
        this.showPage();
        break;
    }
  }

  private navigateToLogin() {
    this.authService.navigateToLogin();
  }

  protected showConfirmation(
    message: LocalizationParam,
    title: LocalizationParam,
  ): Observable<Confirmation.Status> {
    return this.confirmationService.error(message, title, {
      hideCancelBtn: true,
      yesText: 'AbpAccount::Close',
    });
  }

  protected showPage() {
    const key = `defaultError${this.status}`;

    const instance = {
      title: {
        key: DEFAULT_ERROR_LOCALIZATIONS[key]?.title,
        defaultValue: DEFAULT_ERROR_MESSAGES[key]?.title,
      },
      details: {
        key: DEFAULT_ERROR_LOCALIZATIONS[key]?.details,
        defaultValue: DEFAULT_ERROR_MESSAGES[key]?.details,
      },
      status: this.status,
    };
    const shouldRemoveDetail = [401, 404].indexOf(this.status) > -1;
    if (shouldRemoveDetail) {
      delete instance.details;
    }
    this.createErrorComponentService.execute(instance);
  }
}
