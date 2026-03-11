import { Component, OnInit } from '@angular/core';
import { FestivalService } from '../../services/festival.service';
import { Festival } from '../../models/festival.model';

@Component({
  selector: 'app-festivals',
  standalone: false,
  templateUrl: './festivals.html',
  styleUrl: './festivals.css',
})
export class Festivals implements OnInit {
  festivalsList: Festival[] = [];

  constructor(private festivalService: FestivalService) {}

  ngOnInit(): void {
    // Fetches the current state of mock data when the page loads
    this.festivalsList = this.festivalService.getFestivals();
  }
}
