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
    const festivalId = 'fest-1';

    function makeEvent(key: string, target: HTMLElement): KeyboardEvent {
      const event = new KeyboardEvent('keydown', { key, bubbles: true });
      Object.defineProperty(event, 'target', { value: target });
      spyOn(event, 'preventDefault');
      return event;
    }

    it('expands the card when Enter is pressed on the card div', () => {
      const div = document.createElement('div');
      const event = makeEvent('Enter', div);
      component.toggleCardKey(festivalId, event);
      expect(component.expandedId).toBe(festivalId);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('expands the card when Space is pressed on the card div', () => {
      const div = document.createElement('div');
      const event = makeEvent(' ', div);
      component.toggleCardKey(festivalId, event);
      expect(component.expandedId).toBe(festivalId);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('collapses the card when already expanded', () => {
      component.expandedId = festivalId;
      const div = document.createElement('div');
      const event = makeEvent('Enter', div);
      component.toggleCardKey(festivalId, event);
      expect(component.expandedId).toBeNull();
    });

    it('does not toggle when target is an <a> element', () => {
      const a = document.createElement('a');
      const event = makeEvent('Enter', a);
      component.toggleCardKey(festivalId, event);
      expect(component.expandedId).toBeNull();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('does not toggle when target is a <button> element', () => {
      const button = document.createElement('button');
      const event = makeEvent('Enter', button);
      component.toggleCardKey(festivalId, event);
      expect(component.expandedId).toBeNull();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('does not toggle when target is nested inside an <a> element', () => {
      const a = document.createElement('a');
      const span = document.createElement('span');
      a.appendChild(span);
      const event = makeEvent('Enter', span);
      component.toggleCardKey(festivalId, event);
      expect(component.expandedId).toBeNull();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('does not toggle when target is nested inside a <button> element', () => {
      const button = document.createElement('button');
      const span = document.createElement('span');
      button.appendChild(span);
      const event = makeEvent('Enter', span);
      component.toggleCardKey(festivalId, event);
      expect(component.expandedId).toBeNull();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('does nothing for keys other than Enter or Space', () => {
      const div = document.createElement('div');
      const event = makeEvent('Tab', div);
      component.toggleCardKey(festivalId, event);
      expect(component.expandedId).toBeNull();
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });
});
