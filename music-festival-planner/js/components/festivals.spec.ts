import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { Festivals } from './festivals';
import { FestivalService } from '../services/festival.service';
import { StageService } from '../services/stage.service';
import { Festival } from '../models/festival.model';

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

  describe('hasCardImage', () => {
    const baseFestival: Festival = {
      id: 'fest-1',
      name: 'Demo Fest',
      location: 'Austin',
      startDate: '2026-05-10',
      endDate: '2026-05-12',
    };

    it('returns false when imageUrl is missing, blank, or whitespace-only', () => {
      expect(component.hasCardImage({ ...baseFestival })).toBe(false);
      expect(component.hasCardImage({ ...baseFestival, imageUrl: '' })).toBe(false);
      expect(component.hasCardImage({ ...baseFestival, imageUrl: '   ' })).toBe(false);
    });

    it('returns false after onCardImageError is invoked for a festival', () => {
      const festivalWithImage = { ...baseFestival, imageUrl: 'https://example.com/fest.jpg' };
      expect(component.hasCardImage(festivalWithImage)).toBe(true);

      component.onCardImageError(baseFestival.id);

      expect(component.hasCardImage(festivalWithImage)).toBe(false);
    });

    it('returns true when imageUrl exists and no load error is recorded', () => {
      const festivalWithImage = { ...baseFestival, imageUrl: ' https://example.com/fest.jpg ' };
      expect(component.hasCardImage(festivalWithImage)).toBe(true);
      expect(component.getCardImageUrl(festivalWithImage)).toBe('https://example.com/fest.jpg');
    });
  });

  describe('toggleFestivalCardOnKeyboard', () => {
    const festivalId = 'fest-1';

    function makeEvent(key: string, target: HTMLElement): KeyboardEvent {
      const event = new KeyboardEvent('keydown', { key, bubbles: true });
      Object.defineProperty(event, 'target', { value: target });
      vi.spyOn(event, 'preventDefault');
      return event;
    }

    it('expands the card when Enter is pressed on the card div', () => {
      const div = document.createElement('div');
      const event = makeEvent('Enter', div);
      component.toggleFestivalCardOnKeyboard(festivalId, event);
      expect(component.expandedFestivalId).toBe(festivalId);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('expands the card when Space is pressed on the card div', () => {
      const div = document.createElement('div');
      const event = makeEvent(' ', div);
      component.toggleFestivalCardOnKeyboard(festivalId, event);
      expect(component.expandedFestivalId).toBe(festivalId);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('collapses the card when already expanded', () => {
      component.expandedFestivalId = festivalId;
      const div = document.createElement('div');
      const event = makeEvent('Enter', div);
      component.toggleFestivalCardOnKeyboard(festivalId, event);
      expect(component.expandedFestivalId).toBeNull();
    });

    it('does not toggle when target is an <a> element', () => {
      const a = document.createElement('a');
      const event = makeEvent('Enter', a);
      component.toggleFestivalCardOnKeyboard(festivalId, event);
      expect(component.expandedFestivalId).toBeNull();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('does not toggle when target is a <button> element', () => {
      const button = document.createElement('button');
      const event = makeEvent('Enter', button);
      component.toggleFestivalCardOnKeyboard(festivalId, event);
      expect(component.expandedFestivalId).toBeNull();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('does not toggle when target is nested inside an <a> element', () => {
      const a = document.createElement('a');
      const span = document.createElement('span');
      a.appendChild(span);
      const event = makeEvent('Enter', span);
      component.toggleFestivalCardOnKeyboard(festivalId, event);
      expect(component.expandedFestivalId).toBeNull();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('does not toggle when target is nested inside a <button> element', () => {
      const button = document.createElement('button');
      const span = document.createElement('span');
      button.appendChild(span);
      const event = makeEvent('Enter', span);
      component.toggleFestivalCardOnKeyboard(festivalId, event);
      expect(component.expandedFestivalId).toBeNull();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('does nothing for keys other than Enter or Space', () => {
      const div = document.createElement('div');
      const event = makeEvent('Tab', div);
      component.toggleFestivalCardOnKeyboard(festivalId, event);
      expect(component.expandedFestivalId).toBeNull();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });
});
