import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { TechAdminService } from '../../../../../shared/tech-admin.service';
import { IOperationLimit, ICurrency, IOperationObject, ICumulativeObject } from '../../../../../shared/interfaces/limits.interface';
import { ApiService } from '../../../../../shared/api.service';

import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-limits',
  templateUrl: './limits.component.html',
  styleUrls: ['./limits.component.scss']
})
export class LimitsComponent implements OnInit {
  limits: IOperationLimit[];
  currencies: Array<ICurrency>;
  open_modal: boolean;
  types: Array<any>;
  operation: IOperationObject;
  cumulative: ICumulativeObject;
  limitForm: FormGroup;
  defaultType: String;
  constructor(private api: ApiService, public techAdmin: TechAdminService) {
  }

  ngOnInit() {

    this.api.get<IOperationLimit[]>(`${environment.api.crypta}/limits/exchange`)
      .subscribe({
        next: data => {
          this.limits = data;
        },
        error: err => {
        // tslint:disable-next-line:no-console
        console.error(err);
        }
      });

    this.techAdmin.getCurrencies(false).subscribe(({ currencies }) => {
      this.currencies = currencies;
    });

    this.open_modal = false;
    this.types = [
      { name: 'exchange' }, { name: 'internal_transfer' }, { name: 'external_transfer' }
    ];
    this.operation = {
      enabled: false,
      min: 0,
      max: 0,
    };

    this.cumulative = {
      daily: {
        enabled: false,
        max: 0,
      },
      monthly: {
        enabled: false,
        max: 0,
      }
    };
    this.defaultType = 'exchange';

    this.limitForm = new FormGroup({
      _id: new FormControl(''),
      type: new FormControl('', Validators.required),
      currency: new FormControl('exchange', Validators.required),
      operationEnabled: new FormControl(false, Validators.required),
      max: new FormControl(0, Validators.required),
      min: new FormControl(0, Validators.required),
      cumulativeDailyEnabled: new FormControl(false, Validators.required),
      cumulativeDailyMax: new FormControl(0, Validators.required),
      cumulativeMonthlyEnabled: new FormControl(false, Validators.required),
      cumulativeMonthlyMax: new FormControl(0, Validators.required),
    });
  }

  
  toggleOperation(): void {
    this.operation.enabled = !this.operation.enabled;
  }
  toggleCumulative(target): void {
    this.cumulative[target].enabled = !this.cumulative[target].enabled;
  }

  setNumber(event: Event, control: string): void {
    const value = (<HTMLTextAreaElement>event.target).value;
    this.limitForm.get(control).setValue(Number(value) < 0 ? 0 : value);
  }

  editLimitOpenModal(limit: IOperationLimit): void {
    this.clearForm();
    const { operation, cumulative } = limit;
    const { min, max } = operation;
    const { daily, monthly } = cumulative;
    this.limitForm.patchValue(Object.assign(limit,
      {
        operationEnabled: operation.enabled,
        cumulativeDailyEnabled: daily.enabled,
        cumulativeDailyMax: daily.max,
        cumulativeMonthlyEnabled: monthly.enabled,
        cumulativeMonthlyMax: monthly.max,
        min,
        max
      }
    ));
    this.open_modal = true;
  }

  toggleAvailable(limit: IOperationLimit, type: string): void {
    let payload;
    if (type === 'operation') {
      payload = {
        operation: {
          enabled: !limit.operation.enabled,
        },
      };
    } else {
      payload = {
        cumulative: {
          [type]: {
            enabled: !limit.cumulative[type].enabled,
          },
        },
      };
    }

    this.api.patch(`${environment.api.crypta}/limits/${limit.currency}/${limit._id}`, payload)
      .subscribe((res: IOperationLimit) => {
        const i = this.limits.findIndex(e => e._id === res._id);
        this.limits[i] = res;
      },
        err => {
          const { error = {} } = err;
          alert(error.message);
        });
  }

  editLimit(): void {
    const {
      operationEnabled, currency, max, min,
      cumulativeDailyEnabled, cumulativeDailyMax, cumulativeMonthlyEnabled,
      cumulativeMonthlyMax } = this.limitForm.value;

    this.api.patch(`${environment.api.crypta}/limits/${currency}/${this.limitForm.value._id}`, {
      operation: {
        enabled: operationEnabled,
        max,
        min,
      },
      cumulative: {
        daily: {
          enabled: cumulativeDailyEnabled,
          max: cumulativeDailyMax
        },
        monthly: {
          enabled: cumulativeMonthlyEnabled,
          max: cumulativeMonthlyMax
        }
      }
    })
      .subscribe((res: IOperationLimit) => {
        const i = this.limits.findIndex(e => e._id === res._id);
        this.limits[i] = res;
        this.open_modal = false;

      },
        err => {
          const { error = {} } = err;
          alert(error.message);
        });

  }

  createLimit(): void {

    if (this.limitForm.value._id) {
      this.editLimit();
    } else {
      const {
        operationEnabled, type, currency, max, min,
        cumulativeDailyEnabled, cumulativeDailyMax, cumulativeMonthlyEnabled,
        cumulativeMonthlyMax } = this.limitForm.value;


      this.api.post<IOperationLimit>(`${environment.api.crypta}/limits`, {
        type,
        currency,
        operation: {
          enabled: operationEnabled,
          max,
          min,
        },
        cumulative: {
          daily: {
            enabled: cumulativeDailyEnabled,
            max: cumulativeDailyMax
          },
          monthly: {
            enabled: cumulativeMonthlyEnabled,
            max: cumulativeMonthlyMax
          }
        }

      })
        .subscribe(res => {
          this.limits.push(res);
          this.open_modal = false;
        },
          err => {
            const { error = {} } = err;
            alert(error.message);
          }
        );
    }

  }

  addLimit(): void {
    this.clearForm();

    this.limitForm.patchValue({
      min: 0,
      max: 0,
      cumulativeDailyMax: 0,
      cumulativeMonthlyMax: 0,
      type: 'exchange',
      operationEnabled: false,
      cumulativeDailyEnabled: false,
      cumulativeMonthlyEnabled: false,
    });
    this.open_modal = true;
  }
  clearForm(): void {
    this.limitForm.reset();
  }

}
