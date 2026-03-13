import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Home } from './components/home/home';
import { Festivals } from './components/festivals/festivals';
import { MySchedule } from './components/my-schedule/my-schedule';
import { FestivalCreateComponent } from './components/festival-create/festival-create';
import { ReactiveFormsModule } from '@angular/forms';
import { StageCreateComponent } from './components/stage-create/stage-create';
import { StageListComponent } from './components/stage-list/stage-list';

@NgModule({
  declarations: [App, Home, Festivals, MySchedule, FestivalCreateComponent, StageCreateComponent, StageListComponent],
  imports: [BrowserModule, AppRoutingModule, ReactiveFormsModule],
  providers: [provideBrowserGlobalErrorListeners()],
  bootstrap: [App],
})
export class AppModule {}
