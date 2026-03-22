import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { ModalModule } from 'ngx-bootstrap/modal';

import { TableModule }      from 'primeng/table';
import { DropdownModule }   from 'primeng/dropdown';
import { CalendarModule }   from 'primeng/calendar';
import { CheckboxModule }   from 'primeng/checkbox';
import { TagModule }        from 'primeng/tag';
import { InputTextModule }  from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { ButtonModule }     from 'primeng/button';
import { RippleModule }     from 'primeng/ripple';
import { TooltipModule }    from 'primeng/tooltip';
import { SkeletonModule }   from 'primeng/skeleton';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DashboardMockupComponent } from './dashboard-mockup/dashboard-mockup.component';
import { ProjectDetailMockComponent } from './project-detail-mock/project-detail-mock.component';
import { ProjectCreateMockComponent } from './project-create-mock/project-create-mock.component';
import { CommonModule } from '@angular/common';

import { AppComponent } from './app.component';
import { NavbarComponent } from './navbar/navbar.component';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { FooterComponent } from './footer/footer.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { FavoritesComponent } from './dashboard/favorites/favorites.component';
import { ExploreComponent } from './explore/explore.component';
import { ProfileComponent } from './profile/profile.component';
import { ProjectCardComponent } from './shared/project-card/project-card.component';
import { ProfileCardComponent } from './shared/profile-card/profile-card.component';
import { ProfileSettingComponent } from './profile/profile-setting/profile-setting.component';
import { ApplicationPipesModule } from './application-pipes/application-pipes.module';
import { DashboardSocialComponent } from './dashboard/dashboard-social/dashboard-social.component';
import { DashboardFollowingComponent } from './dashboard/dashboard-following/dashboard-following.component';
import { DashboardQuickstartComponent } from './dashboard/dashboard-quickstart/dashboard-quickstart.component';

import { NotFoundComponent } from './error/not-found/not-found.component';
import { ContactUsComponent } from './contact-us/contact-us.component';
import { AboutUsComponent } from './about-us/about-us.component';
import { EmailConfirmationComponent } from './email-confirmation/email-confirmation.component';
import { EmailForgotPassComponent } from './email-confirmation/email-forgot-pass/email-forgot-pass.component';
import { ResetPasswordComponent } from './email-confirmation/reset-password/reset-password.component';
import { EmailResendVerificationComponent } from './email-confirmation/email-resend-verification/email-resend-verification.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    LoginComponent,
    RegisterComponent,
    FooterComponent,
    DashboardComponent,
    FavoritesComponent,
    ExploreComponent,
    ProfileComponent,
    ProjectCardComponent,
    ProfileCardComponent,
    ProfileSettingComponent,
    DashboardSocialComponent,
    DashboardFollowingComponent,
    DashboardQuickstartComponent,
    NavbarComponent,
    NotFoundComponent,
    ContactUsComponent,
    AboutUsComponent,
    EmailConfirmationComponent,
    EmailForgotPassComponent,
    ResetPasswordComponent,
    EmailResendVerificationComponent,
    DashboardMockupComponent,
    ProjectDetailMockComponent,
    ProjectCreateMockComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    ApplicationPipesModule,
    CommonModule,        
    FormsModule,         
    TableModule,         
    DropdownModule,      
    CalendarModule,      
    CheckboxModule,      
    TagModule,           
    InputTextModule,     
    ProgressBarModule,   
    ButtonModule,        
    RippleModule,        
    TooltipModule,       
    SkeletonModule,
    SelectButtonModule,
    ToastrModule.forRoot(),
    ModalModule.forRoot(),
  ],
  providers: [
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
