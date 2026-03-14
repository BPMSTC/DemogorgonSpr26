import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Festivals } from './components/festivals/festivals';
import { MySchedule } from './components/my-schedule/my-schedule';
import { FestivalCreateComponent } from './components/festival-create/festival-create';
import { StageListComponent } from './components/stage-list/stage-list';
import { StageCreateComponent } from './components/stage-create/stage-create';

const routes: Routes = [
  { path: '', component: Home },
  { path: 'festivals', component: Festivals },
  { path: 'festivals/create', component: FestivalCreateComponent },
  { path: 'my-schedule', component: MySchedule },
  { path: 'festivals/:id/stages',      component: StageListComponent },
  { path: 'festivals/:id/stages/new',  component: StageCreateComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
