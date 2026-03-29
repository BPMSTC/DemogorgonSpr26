import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// ---- Page Components -------------------------------------------------------
import { Home }                    from './components/home/home';
import { Festivals }               from './components/festivals/festivals';
import { MySchedule }              from './components/my-schedule/my-schedule';
import { FestivalCreateComponent } from './components/festival-create/festival-create';
import { StageListComponent }      from './components/stage-list/stage-list';
import { StageCreateComponent }    from './components/stage-create/stage-create';
import { PerformanceListComponent }   from './components/performance-list/performance-list';
import { PerformanceCreateComponent } from './components/performance-create/performance-create';

// ---- Route Definitions -----------------------------------------------------
// Each route maps a URL path to the component that renders that page.
// :id is a dynamic parameter holding the festival's unique ID.

const routes: Routes = [
  // Landing page — shown at the root URL "/"
  { path: '', component: Home },

  // Festival browser — lists all festivals as expandable cards
  { path: 'festivals', component: Festivals },

  // Create a new festival
  { path: 'festivals/create', component: FestivalCreateComponent },

  // Standalone schedule view (not tied to a specific festival)
  { path: 'my-schedule', component: MySchedule },

  // Visual timetable grid for a specific festival
  { path: 'festivals/:id/schedule', component: MySchedule },

  // Stage management for a specific festival
  { path: 'festivals/:id/stages',     component: StageListComponent },
  { path: 'festivals/:id/stages/new', component: StageCreateComponent },

  // Performance management for a specific festival
  { path: 'festivals/:id/performances',     component: PerformanceListComponent },
  { path: 'festivals/:id/performances/new', component: PerformanceCreateComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
