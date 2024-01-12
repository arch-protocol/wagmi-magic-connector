import { Chain, UserRejectedRequestError } from "viem";
import { DedicatedWalletConnector, DedicatedWalletOptions } from "./dedicatedWalletConnector";

const connection = {
  email: "email",
  google: "google",
} as const;

type Keys = keyof typeof connection;
type ConnectionType = typeof connection[Keys];

/**
 * Magic Wallet Connector class used to connect to wallet using email and Magic OAuth.
 * Requires setting the email address using `setEmail` in case of OTP email login.
 * 
 * @example
 * ```typescript
 * import { MagicWalletConnector } from 'arch-protocol/wagmi-connector';
 * const connector = new MagicWalletConnector({
 *  options: {
 *     apiKey: YOUR_MAGIC_LINK_API_KEY, //required
 *    ...Other options
 *  },
 * });
 * ```
 * @see https://github.com/arch-protocol/wagmi-magic-connector#-usage
 * @see https://magic.link/docs/dedicated/overview
 */
export class MagicWalletConnector extends DedicatedWalletConnector {
    email: string
    connectionType: ConnectionType

    constructor(config: { chains?: Chain[]; options: DedicatedWalletOptions }) {
      super(config)
      this.magicSdkConfiguration = config.options.magicSdkConfiguration
      this.magicOptions = config.options
      this.oauthCallbackUrl = config.options.callbackUrl
      this.email = ''
      this.connectionType = connection.google
    }

    /**
     * Set the user's email address, necessary for connecting to a wallet with email
     */
    setEmail(email: string) {
      this.connectionType = connection.email
      this.email = email
    }

    /**
     * Set the OAuth callback URL, necessary for connecting to a wallet with google
     */
    setOauthCallback(callbackUrl: string) {
      this.oauthCallbackUrl = callbackUrl
    }

    /**
     * Connect method attempts to connects to wallet using Dedicated Wallet modal
     * this will open a modal for the user to select their wallet
     */
    async connect() {
      if (!this.magicOptions.apiKey)
        throw new Error('Magic API Key is not provided.')
      
      if (!this.email && this.connectionType === connection.email)
        throw new Error('Email is not provided.')  

      const provider = await this.getProvider()
  
      if (provider?.on) {
        provider.on('accountsChanged', this.onAccountsChanged)
        provider.on('chainChanged', this.onChainChanged)
        provider.on('disconnect', this.onDisconnect)
      }
  
      // Check if we have a chainId, in case of error just assign 0 for legacy
      let chainId: number
      try {
        chainId = await this.getChainId()
      } catch {
        chainId = 0
      }
  
      // if there is a user logged in, return the user
      if (await this.isAuthorized()) {
        return {
          provider,
          chain: {
            id: chainId,
            unsupported: false,
          },
          account: await this.getAccount(),
        }
      }
  
      const magic = this.getMagicSDK()
  
      // LOGIN WITH MAGIC USING EMAIL
      if (this.connectionType === connection.email)
        await magic.auth.loginWithEmailOTP({
          email: this.email,
        })

      // LOGIN WITH MAGIC USING OAUTH PROVIDER
      if (this.connectionType === connection.google)
        await magic.oauth.loginWithRedirect({
          provider: "google",
          redirectURI: this.oauthCallbackUrl || window.location.href,
        })
  
      if (await magic.user.isLoggedIn())
        return {
          account: await this.getAccount(),
          chain: {
            id: chainId,
            unsupported: false,
          },
          provider,
        }
      throw new UserRejectedRequestError(Error('User Rejected Request'))
    }

}