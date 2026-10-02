import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Forms "template-driven" (con ngModel), distinto a ReactiveFormsModule
import { IonContent } from '@ionic/angular';
import { Router } from '@angular/router'; // Servicio para navegar entre pantallas desde código
import axios from 'axios';
import anime from 'animejs'; // Librería externa de animaciones (nada que ver con Angular/Ionic)

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  // Solo estos 3 están disponibles en el HTML de esta pantalla.
  // OJO: no está ReactiveFormsModule aquí, porque este login usa ngModel, no FormGroup.
  imports: [IonContent, CommonModule, FormsModule],
})
export class LoginPage implements OnInit {

  // @ViewChild agarra una referencia directa a un elemento del HTML.
  // Aquí apunta a un <path> de SVG que tenga #pathRef, para poder animarlo con JS.
  @ViewChild('pathRef') pathRef!: ElementRef<SVGPathElement>;

  // Variables conectadas al HTML con [(ngModel)] — se actualizan solas
  // cada vez que el usuario escribe en los inputs de email/password.
  email: string = '';
  password: string = '';
  error: string = ''; // Aquí se guarda el mensaje de error para mostrarlo en pantalla

  // Guarda la animación actual, para poder pausarla si se dispara otra antes de que termine.
  private currentAnim: anime.AnimeInstance | null = null;

  // URL de la API de LOGIN — OJO: es una API distinta a la de contactos (api/index.php).
  // Esta debe existir en C:\xampp\htdocs\miapi\login.php para que el login funcione.
  private API_URL = 'http://localhost/miapi/login.php';

  // Router se inyecta en el constructor para poder usarlo después con this.router
  constructor(private router: Router) {}

  ngOnInit() {}

  // Anima el trazo de un SVG (efecto visual, no afecta la lógica del login)
  animatePath(offset: number, dasharray: string) {
    if (this.currentAnim) this.currentAnim.pause(); // evita que se encimen animaciones
    this.currentAnim = anime({
      targets: this.pathRef.nativeElement,
      strokeDashoffset: { value: offset, duration: 700, easing: 'easeOutQuart' },
      strokeDasharray: { value: dasharray, duration: 700, easing: 'easeOutQuart' },
    });
  }

  // Se ejecuta cuando el usuario da submit al formulario de login
  async handleLogin(e: Event) {
    e.preventDefault(); // evita que el navegador recargue la página (comportamiento normal de un <form>)
    this.error = '';
    this.animatePath(-730, '530 1386'); // dispara la animación decorativa

    try {
      // Manda email y password a la API de login por POST
      const response = await axios.post(this.API_URL, {
        email: this.email,
        password: this.password,
      });

      // Si la API responde success:true, entramos a la app.
      // navigateByUrl cambia de pantalla SIN recargar el navegador (navegación de SPA).
      if (response.data.success) {
        this.router.navigateByUrl('/tabs/tab1');
      } else {
        this.error = 'Usuario o contraseña incorrectos';
      }
    } catch (err) {
      // Si la petición ni siquiera llegó a buen puerto (servidor caído, CORS, etc.)
      console.error(err);
      this.error = 'No se pudo conectar con el servidor';
    }
  }
}