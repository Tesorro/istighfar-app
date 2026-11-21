import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { COOKIE_NAME } from "../config/env";
import { CurrentUser } from "../common/current-user.decorator";
import type { AuthUser } from "../common/auth-user";
import { clearRefreshCookie, setRefreshCookie } from "../common/cookies";
import { assertAllowedOrigin } from "../common/origin";
import { Public } from "../common/public.decorator";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AuthService } from "./auth.service";
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "./auth.schemas";
import { RefreshRejectedException } from "./refresh-token.service";

const authThrottle = { default: { limit: 10, ttl: 60_000 } };

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle(authThrottle)
  // @Post('register')
  // async register(
  //   @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
  //   @Res({ passthrough: true }) response: Response,
  // ) {
  //   const session = await this.auth.register(body);
  //   setRefreshCookie(response, session.refreshToken);
  //   return { accessToken: session.accessToken, user: session.user };
  // }
  @Post("register")
  async register() {
    throw new ForbiddenException("Регистрация временно отключена");
  }

  @Public()
  @Throttle(authThrottle)
  @HttpCode(200)
  @Post("login")
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.auth.login(body);
    setRefreshCookie(response, session.refreshToken);
    return { accessToken: session.accessToken, user: session.user };
  }

  @Public()
  @Throttle(authThrottle)
  @HttpCode(200)
  @Post("refresh")
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertAllowedOrigin(request);
    try {
      const session = await this.auth.refresh(readRefreshCookie(request));
      setRefreshCookie(response, session.refreshToken);
      return { accessToken: session.accessToken, user: session.user };
    } catch (error) {
      if (error instanceof RefreshRejectedException && error.clearCookie) {
        clearRefreshCookie(response);
      }
      throw error;
    }
  }

  @Public()
  @HttpCode(200)
  @Post("logout")
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    assertAllowedOrigin(request);
    await this.auth.logout(readRefreshCookie(request));
    clearRefreshCookie(response);
    return { ok: true };
  }

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}

function readRefreshCookie(request: Request): string | undefined {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[COOKIE_NAME];
  return typeof value === "string" ? value : undefined;
}
