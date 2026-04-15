import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { LocationStrategy, HashLocationStrategy } from '@angular/common';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Home } from './components/home/home';
import { Festivals } from './components/festivals/festivals';
import { MySchedule } from './components/my-schedule/my-schedule';
import { FestivalCreateComponent } from './components/festival-create/festival-create';
import { ReactiveFormsModule } from '@angular/forms';
import { StageCreateComponent } from './components/stage-create/stage-create';
import { StageListComponent } from './components/stage-list/stage-list';
import { PerformanceListComponent } from './components/performance-list/performance-list';
import { PerformanceCreateComponent } from './components/performance-create/performance-create';

@NgModule({
  declarations: [
    App,
    Home,
    Festivals,
    MySchedule,
    FestivalCreateComponent,
    StageCreateComponent,
    StageListComponent,
    PerformanceListComponent,
    PerformanceCreateComponent,
  ],
  imports: [BrowserModule, AppRoutingModule, ReactiveFormsModule],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch()),
    { provide: LocationStrategy, useClass: HashLocationStrategy },
  ],
  bootstrap: [App],
})
export class AppModule {}
