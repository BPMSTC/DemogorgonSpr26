import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { Festivals } from './festivals';
import { FestivalService } from '../../services/festival.service';
import { StageService } from '../../services/stage.service';

describe('Festivals', () => {
  let component: Festivals;
  let fixture: ComponentFixture<Festivals>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterModule.forRoot([])],
      declarations: [Festivals],
      providers: [FestivalService, StageService],
    }).compileComponents();

    fixture = TestBed.createComponent(Festivals);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('toggleCardKey', () => {
    const makeKeyEvent = (key: string, target: HTMLElement): KeyboardEvent => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true });
      Object.defineProperty(event, 'target', { value: target, writable: false });
      return event;
    };

    it('should expand the card when Enter is pressed on the card itself', () => {
      const cardEl = document.createElement('div');
      const event = makeKeyEvent('Enter', cardEl);
      component.expandedId = null;
      component.toggleCardKey('1', event);
      expect(component.expandedId).toBe('1');
    });

    it('should expand the card when Space is pressed on the card itself', () => {
      const cardEl = document.createElement('div');
      const event = makeKeyEvent(' ', cardEl);
      component.expandedId = null;
      component.toggleCardKey('1', event);
      expect(component.expandedId).toBe('1');
    });

    it('should collapse the card when Enter is pressed and card is already expanded', () => {
      const cardEl = document.createElement('div');
      const event = makeKeyEvent('Enter', cardEl);
      component.expandedId = '1';
      component.toggleCardKey('1', event);
      expect(component.expandedId).toBeNull();
    });

    it('should NOT toggle the card when Enter is pressed on an anchor element', () => {
      const link = document.createElement('a');
      const event = makeKeyEvent('Enter', link);
      component.expandedId = null;
      component.toggleCardKey('1', event);
      expect(component.expandedId).toBeNull();
    });

    it('should NOT toggle the card when Enter is pressed on a button element', () => {
      const btn = document.createElement('button');
      const event = makeKeyEvent('Enter', btn);
      component.expandedId = null;
      component.toggleCardKey('1', event);
      expect(component.expandedId).toBeNull();
    });

    it('should NOT toggle the card when Enter is pressed on a child anchor inside the card', () => {
      const card = document.createElement('div');
      const header = document.createElement('div');
      const link = document.createElement('a');
      card.appendChild(header);
      header.appendChild(link);
      const event = makeKeyEvent('Enter', link);
      component.expandedId = null;
      component.toggleCardKey('1', event);
      expect(component.expandedId).toBeNull();
    });

    it('should NOT toggle the card when Enter is pressed on a child button inside the card', () => {
      const card = document.createElement('div');
      const kebab = document.createElement('div');
      kebab.className = 'kebab-menu';
      const btn = document.createElement('button');
      kebab.appendChild(btn);
      card.appendChild(kebab);
      const event = makeKeyEvent('Enter', btn);
      component.expandedId = null;
      component.toggleCardKey('1', event);
      expect(component.expandedId).toBeNull();
    });

    it('should ignore keys other than Enter and Space', () => {
      const cardEl = document.createElement('div');
      const event = makeKeyEvent('Tab', cardEl);
      component.expandedId = null;
      component.toggleCardKey('1', event);
      expect(component.expandedId).toBeNull();
    });
  });
});
