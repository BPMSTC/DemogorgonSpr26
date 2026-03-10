import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Home } from './components/home/home';
import { Festivals } from './components/festivals/festivals';
import { MySchedule } from './components/my-schedule/my-schedule';

@NgModule({
  declarations: [App, Home, Festivals, MySchedule],
  imports: [BrowserModule, AppRoutingModule],
  providers: [provideBrowserGlobalErrorListeners()],
  bootstrap: [App],
})
export class AppModule {}
