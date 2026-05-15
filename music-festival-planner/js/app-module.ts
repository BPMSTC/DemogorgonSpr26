import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { LocationStrategy, HashLocationStrategy } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Home } from './components/home';
import { Festivals } from './components/festivals';
import { MySchedule } from './components/my-schedule';
import { FestivalCreateComponent } from './components/festival-create';
import { ReactiveFormsModule } from '@angular/forms';
import { StageCreateComponent } from './components/stage-create';
import { StageListComponent } from './components/stage-list';
import { PerformanceListComponent } from './components/performance-list';
import { PerformanceCreateComponent } from './components/performance-create';
import { LoginComponent } from './components/login';
import { AdminDashboardComponent } from './components/admin-dashboard';
import { authInterceptor } from './interceptors/auth.interceptor';

// The root Angular module — declares every component and wires up global providers.
@NgModule({
  // Register every component so Angular's template compiler can resolve their selectors.
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
    LoginComponent,
    AdminDashboardComponent,
  ],
  // Pull in the browser platform, routing, and reactive forms support.
  imports: [BrowserModule, AppRoutingModule, ReactiveFormsModule],
  providers: [
    // Register a global error listener so unhandled errors are captured by the browser.
    provideBrowserGlobalErrorListeners(),
    // Set up the HTTP client using the Fetch API and attach the JWT auth interceptor.
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    // Use hash-based URLs (e.g. /#/festivals) so the app works without server-side routing config.
    { provide: LocationStrategy, useClass: HashLocationStrategy },
  ],
  // Tell Angular which component to render first when the page loads.
  bootstrap: [App],
})
export class AppModule {}
