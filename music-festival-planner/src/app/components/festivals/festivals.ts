import { Component, OnInit } from '@angular/core';
import { Festival } from '../../models/festival.model';
import { FestivalService } from '../../services/festival.service';

@Component({
  selector: 'app-festivals',
  standalone: false,
  templateUrl: './festivals.html',
  styleUrl: './festivals.css',
})
export class Festivals implements OnInit {
  festivals: Festival[] = [];

  constructor(private festivalService: FestivalService) {}

  ngOnInit(): void {
    this.festivals = this.festivalService.getFestivals();
  }
}
