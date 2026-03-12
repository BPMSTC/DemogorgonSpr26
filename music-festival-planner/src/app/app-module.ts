import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Home } from './components/home/home';
import { Festivals } from './components/festivals/festivals';
import { MySchedule } from './components/my-schedule/my-schedule';
import { FestivalCreateComponent } from './components/festival-create/festival-create';
import { ReactiveFormsModule } from '@angular/forms';
import { FestivalService } from './services/festival.service';

const MOCK_FESTIVALS = [
  {
    name: 'Lollapalooza',
    startDate: '2026-08-01',
    endDate: '2026-08-04',
    location: 'Chicago, IL',
  },
  {
    name: 'Coachella Valley Music and Arts Festival',
    startDate: '2026-04-10',
    endDate: '2026-04-19',
    location: 'Indio, CA',
  },
  {
    name: 'Bonnaroo Music and Arts Festival',
    startDate: '2026-06-11',
    endDate: '2026-06-14',
    location: 'Manchester, TN',
  },
];

@NgModule({
  declarations: [App, Home, Festivals, MySchedule, FestivalCreateComponent],
  imports: [BrowserModule, AppRoutingModule, ReactiveFormsModule],
  providers: [provideBrowserGlobalErrorListeners()],
  bootstrap: [App],
})
export class AppModule {
  // Seeds sample festivals so the Festivals page has data on first load.
  // Replace with an API call or environment-specific initializer in a production build.
  constructor(festivalService: FestivalService) {
    MOCK_FESTIVALS.forEach((festival) => festivalService.createFestival(festival));
  }
}
