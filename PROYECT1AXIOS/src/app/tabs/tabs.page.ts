import { Component } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  mailOutline, peopleOutline, documentTextOutline, personCircleOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsPage {
  constructor() {
    addIcons({
      'mail-outline': mailOutline,
      'people-outline': peopleOutline,
      'document-text-outline': documentTextOutline,
      'person-circle-outline': personCircleOutline
    });
  }
}
